-- Treat proposal approval as an irreversible business event. A proposal that has
-- been approved (by status or approval timestamp) cannot be moved back to a
-- non-approved status through direct table updates or the CRM editor.
create or replace function public.prevent_approved_proposal_status_rollback()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_was_approved boolean;
  v_remains_approved boolean;
begin
  v_was_approved := lower(btrim(coalesce(old.status::text, ''))) in ('approved', 'accepted')
    or old.approved_at is not null;
  v_remains_approved := lower(btrim(coalesce(new.status::text, ''))) in ('approved', 'accepted');

  if v_was_approved and not v_remains_approved and old.status::text is distinct from new.status::text then
    raise exception 'An approved proposal cannot return to a non-approved status.'
      using errcode = '23514';
  end if;

  if old.approved_at is not null and new.approved_at is distinct from old.approved_at then
    raise exception 'The proposal approval timestamp is immutable.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists proposals_prevent_approved_status_rollback on public.proposals;
create trigger proposals_prevent_approved_status_rollback
before update of status, approved_at on public.proposals
for each row
execute function public.prevent_approved_proposal_status_rollback();
