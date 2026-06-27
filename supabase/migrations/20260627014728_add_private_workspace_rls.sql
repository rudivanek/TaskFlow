
-- Update workspace SELECT policy: hide private workspaces from non-owners
DROP POLICY IF EXISTS "select_all_workspaces" ON public.workspaces;

CREATE POLICY "select_all_workspaces" ON public.workspaces FOR SELECT
  TO authenticated USING (
    private = false
    OR user_id = auth.uid()
  );

-- Update projects SELECT policy: hide projects in private workspaces from non-owners
DROP POLICY IF EXISTS "select_all_projects" ON public.projects;

CREATE POLICY "select_all_projects" ON public.projects FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_id
        AND (w.private = false OR w.user_id = auth.uid())
    )
  );
