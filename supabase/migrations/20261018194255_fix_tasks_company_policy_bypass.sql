-- Remove legacy company-only policies that OR with the role/assignment-aware
-- task policies and therefore bypass their authorization checks.
DROP POLICY IF EXISTS "tasks_select_company" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_company" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_company" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_company" ON public.tasks;
