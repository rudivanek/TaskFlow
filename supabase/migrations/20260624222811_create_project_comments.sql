CREATE TABLE public.project_comments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_project_comments" ON public.project_comments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "insert_own_project_comments" ON public.project_comments FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "update_own_project_comments" ON public.project_comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_project_comments" ON public.project_comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
