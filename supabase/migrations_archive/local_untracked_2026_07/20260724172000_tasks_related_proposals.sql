alter table if exists public.tasks
  add column if not exists related_proposal_id uuid null references public.proposals(id) on delete set null;

create index if not exists idx_tasks_related_proposal
  on public.tasks(company_id, related_proposal_id, updated_at desc);
