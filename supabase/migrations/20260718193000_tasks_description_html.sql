alter table public.tasks
  add column if not exists description_html text;

update public.tasks
set description_html = replace(replace(description, '&', '&amp;'), '<', '&lt;')
where description_html is null
  and description is not null
  and description <> '';
