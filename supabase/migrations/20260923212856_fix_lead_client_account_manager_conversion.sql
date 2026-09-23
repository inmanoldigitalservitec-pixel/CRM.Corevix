-- Resolve the lead assignee to the profile key expected by clients.account_manager.
CREATE OR REPLACE FUNCTION public.convert_lead_to_client(p_lead_id uuid, p_existing_client_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lead public.leads%rowtype;
  v_client public.clients%rowtype;
  v_contact public.contacts%rowtype;
  v_actor_profile_id uuid;
  v_account_manager_profile_id uuid;
  v_contact_name text;
  v_company_name text;
  v_tags text[];
  v_now timestamptz := now();
  v_counts jsonb;
begin
  select *
    into v_lead
  from public.leads
  where id = p_lead_id
  for update;

  if not found then
    raise exception 'Prospecto no encontrado';
  end if;

  select p.id
    into v_actor_profile_id
  from public.profiles p
  where p.user_id = auth.uid()
    and p.company_id = v_lead.company_id
    and coalesce(p.is_active, true)
  limit 1;

  if v_actor_profile_id is null then
    raise exception 'No tienes acceso a este prospecto';
  end if;

  -- leads.assigned_to stores the auth user ID; clients.account_manager references profiles.id.
  if v_lead.assigned_to is not null then
    select p.id
      into v_account_manager_profile_id
    from public.profiles p
    where p.company_id = v_lead.company_id
      and (p.user_id = v_lead.assigned_to or p.id = v_lead.assigned_to)
    order by (p.user_id = v_lead.assigned_to) desc
    limit 1;
  end if;

  if v_lead.converted_client_id is not null then
    select * into v_client from public.clients where id = v_lead.converted_client_id;
    select * into v_contact from public.contacts where id = v_lead.converted_contact_id;

    return jsonb_build_object(
      'already_converted', true,
      'client_id', v_lead.converted_client_id,
      'contact_id', v_lead.converted_contact_id,
      'counts', jsonb_build_object()
    );
  end if;

  v_contact_name := nullif(trim(concat_ws(' ', v_lead.first_name, v_lead.last_name)), '');
  v_company_name := coalesce(nullif(trim(v_lead.company_name), ''), v_contact_name, 'Cliente');
  v_tags := coalesce(v_lead.tags, '{}') || coalesce(
    array(
      select jsonb_array_elements_text(
        case
          when jsonb_typeof(v_lead.metadata -> 'tags') = 'array' then v_lead.metadata -> 'tags'
          else '[]'::jsonb
        end
      )
    ),
    '{}'
  );
  select coalesce(array_agg(distinct x), '{}') into v_tags
  from unnest(v_tags) as x
  where nullif(trim(x), '') is not null;

  if p_existing_client_id is not null then
    select *
      into v_client
    from public.clients
    where id = p_existing_client_id
      and company_id = v_lead.company_id
    for update;

    if not found then
      raise exception 'El cliente seleccionado no existe o pertenece a otra compañía';
    end if;

    update public.clients
      set contact_person = coalesce(contact_person, v_contact_name),
          email = coalesce(email, v_lead.email),
          phone = coalesce(phone, v_lead.phone),
          whatsapp = coalesce(whatsapp, v_lead.whatsapp),
          website = coalesce(website, v_lead.website),
          industry = coalesce(industry, v_lead.industry),
          address = coalesce(address, v_lead.address),
          city = coalesce(city, v_lead.city),
          state = coalesce(state, v_lead.state),
          country = coalesce(country, v_lead.country),
          postal_code = coalesce(postal_code, v_lead.postal_code),
          source = coalesce(source, v_lead.source),
          account_manager = coalesce(account_manager, v_account_manager_profile_id),
          tags = coalesce(tags, '{}') || v_tags,
          notes = case
            when nullif(trim(coalesce(v_lead.notes, '')), '') is null then notes
            when nullif(trim(coalesce(notes, '')), '') is null then v_lead.notes
            else notes || E'\n\nImportado desde prospecto:\n' || v_lead.notes
          end,
          original_lead_id = coalesce(original_lead_id, v_lead.id),
          drive_folder_id = coalesce(drive_folder_id, v_lead.drive_folder_id),
          drive_folder_url = coalesce(drive_folder_url, v_lead.drive_folder_url),
          converted_at = coalesce(converted_at, v_now),
          updated_at = v_now
      where id = v_client.id
      returning * into v_client;
  else
    insert into public.clients (
      company_id,
      company_name,
      contact_person,
      email,
      phone,
      whatsapp,
      status,
      industry,
      website,
      address,
      city,
      state,
      country,
      postal_code,
      notes,
      tags,
      account_manager,
      source,
      original_lead_id,
      drive_folder_id,
      drive_folder_url,
      converted_at
    ) values (
      v_lead.company_id,
      v_company_name,
      v_contact_name,
      v_lead.email,
      v_lead.phone,
      v_lead.whatsapp,
      'Active',
      v_lead.industry,
      v_lead.website,
      v_lead.address,
      v_lead.city,
      v_lead.state,
      v_lead.country,
      v_lead.postal_code,
      v_lead.notes,
      v_tags,
      v_account_manager_profile_id,
      v_lead.source,
      v_lead.id,
      v_lead.drive_folder_id,
      v_lead.drive_folder_url,
      v_now
    ) returning * into v_client;
  end if;

  select *
    into v_contact
  from public.contacts
  where company_id = v_lead.company_id
    and original_lead_id = v_lead.id
  limit 1
  for update;

  if not found then
    insert into public.contacts (
      company_id,
      client_id,
      first_name,
      last_name,
      email,
      phone,
      whatsapp,
      position,
      department,
      is_primary,
      notes,
      tags,
      original_lead_id,
      default_language
    ) values (
      v_lead.company_id,
      v_client.id,
      coalesce(nullif(trim(v_lead.first_name), ''), v_company_name),
      coalesce(v_lead.last_name, ''),
      v_lead.email,
      v_lead.phone,
      v_lead.whatsapp,
      v_lead.position,
      v_lead.department,
      true,
      v_lead.notes,
      v_tags,
      v_lead.id,
      v_lead.default_language
    ) returning * into v_contact;
  else
    update public.contacts
      set client_id = v_client.id,
          email = coalesce(email, v_lead.email),
          phone = coalesce(phone, v_lead.phone),
          whatsapp = coalesce(whatsapp, v_lead.whatsapp),
          position = coalesce(position, v_lead.position),
          department = coalesce(department, v_lead.department),
          default_language = coalesce(default_language, v_lead.default_language),
          is_primary = true,
          updated_at = v_now
      where id = v_contact.id
      returning * into v_contact;
  end if;

  update public.drive_files
    set linked_type = 'client',
        linked_id = v_client.id
  where company_id = v_lead.company_id
    and linked_type = 'lead'
    and linked_id = v_lead.id;

  update public.deals
    set client_id = v_client.id,
        updated_at = v_now
  where company_id = v_lead.company_id
    and lead_id = v_lead.id
    and client_id is distinct from v_client.id;

  update public.proposals
    set client_id = v_client.id,
        updated_at = v_now
  where company_id = v_lead.company_id
    and lead_id = v_lead.id
    and client_id is distinct from v_client.id;

  update public.tasks
    set related_client_id = v_client.id,
        updated_at = v_now
  where company_id = v_lead.company_id
    and related_lead_id = v_lead.id
    and related_client_id is distinct from v_client.id;

  update public.calendar_events
    set related_client_id = v_client.id,
        updated_at = v_now
  where company_id = v_lead.company_id
    and related_lead_id = v_lead.id
    and related_client_id is distinct from v_client.id;

  update public.tickets
    set client_id = v_client.id,
        contact_id = coalesce(contact_id, v_contact.id),
        updated_at = v_now
  where company_id = v_lead.company_id
    and lead_id = v_lead.id
    and client_id is distinct from v_client.id;

  update public.leads
    set status = 'Won',
        converted_client_id = v_client.id,
        converted_contact_id = v_contact.id,
        converted_at = v_now,
        updated_at = v_now
  where id = v_lead.id;

  select jsonb_build_object(
    'deals', (select count(*) from public.deals where company_id = v_lead.company_id and lead_id = v_lead.id and client_id = v_client.id),
    'proposals', (select count(*) from public.proposals where company_id = v_lead.company_id and lead_id = v_lead.id and client_id = v_client.id),
    'tasks', (select count(*) from public.tasks where company_id = v_lead.company_id and related_lead_id = v_lead.id and related_client_id = v_client.id),
    'reminders', (select count(*) from public.calendar_events where company_id = v_lead.company_id and related_lead_id = v_lead.id and related_client_id = v_client.id),
    'tickets', (select count(*) from public.tickets where company_id = v_lead.company_id and lead_id = v_lead.id and client_id = v_client.id)
  ) into v_counts;

  return jsonb_build_object(
    'already_converted', false,
    'client_id', v_client.id,
    'contact_id', v_contact.id,
    'counts', v_counts
  );
end;
$function$

