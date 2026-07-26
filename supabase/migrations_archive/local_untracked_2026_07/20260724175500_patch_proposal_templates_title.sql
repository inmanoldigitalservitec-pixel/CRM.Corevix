alter table public.proposal_templates
  add column if not exists title text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'proposal_templates'
      and column_name = 'name'
  ) then
    execute 'update public.proposal_templates set title = coalesce(nullif(title, ''''), nullif(name, ''''), ''Template sin título'') where title is null or title = ''''';
  else
    update public.proposal_templates
    set title = 'Template sin título'
    where title is null or title = '';
  end if;
end $$;

alter table public.proposal_templates
  alter column title set default 'Template sin título',
  alter column title set not null;

notify pgrst, 'reload schema';
