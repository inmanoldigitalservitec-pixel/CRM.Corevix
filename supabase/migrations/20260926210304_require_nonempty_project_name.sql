-- Prevent new projects from being saved with an empty or whitespace-only name.
-- NOT VALID preserves any legacy rows while enforcing the rule for new inserts
-- and updates. Existing data can be audited before validating the constraint.
alter table public.projects
  add constraint projects_name_not_blank
  check (name is not null and name ~ '[^[:space:]]')
  not valid;
