-- Public proposal read RPC.
-- Exposes only the fields needed by the public proposal page.

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
begin
  if p_proposal_public_token is null or btrim(p_proposal_public_token) = '' then
    return jsonb_build_object('proposal', null);
  end if;

  select p.*
    into v_proposal
  from public.proposals p
  where p.public_token = p_proposal_public_token
  limit 1;

  if v_proposal.id is null then
    return jsonb_build_object('proposal', null);
  end if;

  update public.proposals p
  set
    viewed_at = coalesce(p.viewed_at, now()),
    status = case when p.status = 'Sent' then 'Viewed' else p.status end,
    updated_at = now()
  where p.id = v_proposal.id;

  return jsonb_build_object(
    'proposal',
    jsonb_strip_nulls(
      jsonb_build_object(
        'id', v_proposal.id,
        'title', v_proposal.title,
        'number', v_proposal.number,
        'status', case when v_proposal.status = 'Sent' then 'Viewed' else v_proposal.status end,
        'amount', v_proposal.amount,
        'currency', v_proposal.currency,
        'content', v_proposal.content,
        'proposal_data', coalesce(v_proposal.proposal_data, '{}'::jsonb),
        'valid_until', v_proposal.valid_until,
        'approved_at', v_proposal.approved_at,
        'public_token', v_proposal.public_token,
        'created_at', v_proposal.created_at,
        'updated_at', now()
      )
    )
  );
end;
$$;

revoke all on function public.get_proposal_public(text) from public;
grant execute on function public.get_proposal_public(text) to anon, authenticated;
