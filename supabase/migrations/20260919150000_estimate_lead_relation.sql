alter table public.estimates
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

create index if not exists estimates_company_lead_idx
  on public.estimates(company_id, lead_id);

create or replace function public.get_estimate_public(p_public_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estimate public.estimates%rowtype;
  v_client jsonb := '{}'::jsonb;
  v_lead jsonb := '{}'::jsonb;
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

  if v_estimate.lead_id is not null then
    select coalesce(to_jsonb(l), '{}'::jsonb) into v_lead
    from public.leads l
    where l.id = v_estimate.lead_id and l.company_id = v_estimate.company_id
    limit 1;
  end if;

  select coalesce(jsonb_agg(to_jsonb(i) order by i.sort_order, i.created_at), '[]'::jsonb)
    into v_items
  from public.estimate_items i
  where i.estimate_id = v_estimate.id and i.company_id = v_estimate.company_id;

  return jsonb_build_object(
    'estimate', to_jsonb(v_estimate) || jsonb_build_object('client', v_client, 'lead', v_lead),
    'items', v_items
  );
end;
$$;

grant execute on function public.get_estimate_public(text) to anon, authenticated;