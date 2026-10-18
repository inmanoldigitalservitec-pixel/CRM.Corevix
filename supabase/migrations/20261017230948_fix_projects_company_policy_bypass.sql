-- Remove legacy permissive policies that OR together with the guarded project
-- policies, then restore the intended role and profile-manager checks.
DROP POLICY IF EXISTS "projects_select_company" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_company" ON public.projects;
DROP POLICY IF EXISTS "projects_update_company" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_company" ON public.projects;

DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select"
ON public.projects
FOR SELECT
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager','viewer']::public.app_role[])
    OR (
      public.has_any_role(auth.uid(), ARRAY['sales_agent','collaborator']::public.app_role[])
      AND (
        manager = public.get_current_profile_id()
        OR EXISTS (
          SELECT 1
          FROM public.project_assignees pa
          WHERE pa.project_id = projects.id
            AND pa.company_id = projects.company_id
            AND pa.user_id = auth.uid()
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert"
ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_any_role(auth.uid(), ARRAY['sales_agent','collaborator']::public.app_role[])
      AND manager = public.get_current_profile_id()
    )
  )
);

DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update"
ON public.projects
FOR UPDATE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_any_role(auth.uid(), ARRAY['sales_agent','collaborator']::public.app_role[])
      AND (
        manager = public.get_current_profile_id()
        OR EXISTS (
          SELECT 1
          FROM public.project_assignees pa
          WHERE pa.project_id = projects.id
            AND pa.company_id = projects.company_id
            AND pa.user_id = auth.uid()
        )
      )
    )
  )
)
WITH CHECK (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND (
    public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
    OR (
      public.has_any_role(auth.uid(), ARRAY['sales_agent','collaborator']::public.app_role[])
      AND (
        manager = public.get_current_profile_id()
        OR EXISTS (
          SELECT 1
          FROM public.project_assignees pa
          WHERE pa.project_id = projects.id
            AND pa.company_id = projects.company_id
            AND pa.user_id = auth.uid()
        )
      )
    )
  )
);

DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete"
ON public.projects
FOR DELETE
TO authenticated
USING (
  public.is_company_member()
  AND company_id = public.get_current_company_id()
  AND public.has_any_role(auth.uid(), ARRAY['super_admin','admin','manager']::public.app_role[])
);
