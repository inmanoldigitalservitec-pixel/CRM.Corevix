-- Public proposal document read RPC.
-- Returns proposal header, linked client data and proposal line items for the public document view.

create or replace function public.get_proposal_public(
  p_proposal_public_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_client jsonb := '{}'::jsonb;
  v_items jsonb := '[]'::jsonb;
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
        'content', v_proposal.content,
        'description', v_proposal.description,
        'notes', v_proposal.notes,
        'proposal_date', v_proposal.proposal_date,
        'proposal_data', coalesce(v_proposal.proposal_data, '{}'::jsonb),
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
    'items',
    v_items
  );
end;
$$;

revoke all on function public.get_proposal_public(text) from public;
grant execute on function public.get_proposal_public(text) to anon, authenticated;
