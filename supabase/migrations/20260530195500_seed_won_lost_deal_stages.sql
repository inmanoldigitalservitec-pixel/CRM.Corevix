-- Hotfix: seed missing Won/Lost stages for every company so internal
-- pipeline actions can close deals without relying on non-existent columns.
-- Safe/idempotent for fresh installs and existing databases.

insert into public.deal_stages (company_id, name, display_order, color)
select
  c.id as company_id,
  seeded.name,
  seeded.display_order,
  seeded.color
from public.companies c
cross join (
  values
    ('Won', 6, '#16a34a'),
    ('Lost', 7, '#e11d48')
) as seeded(name, display_order, color)
where not exists (
  select 1
  from public.deal_stages existing
  where existing.company_id = c.id
    and lower(existing.name) = lower(seeded.name)
);
