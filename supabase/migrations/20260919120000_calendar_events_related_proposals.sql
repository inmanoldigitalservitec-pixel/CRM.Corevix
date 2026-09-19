alter table public.calendar_events
  add column if not exists related_proposal_id uuid references public.proposals(id) on delete set null;

create index if not exists idx_calendar_events_company_proposal_start
  on public.calendar_events(company_id, related_proposal_id, start_at);
