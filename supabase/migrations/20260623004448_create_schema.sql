
-- Enable uuid-ossp (already available but ensure in public schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Users table (linked to auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  is_test_user BOOLEAN DEFAULT false
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_user" ON public.users FOR SELECT
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert_own_user" ON public.users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_user" ON public.users FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_user" ON public.users FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  private BOOLEAN DEFAULT false,
  show_in_time_estimates BOOLEAN DEFAULT true
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_workspaces" ON public.workspaces FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_workspaces" ON public.workspaces FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_workspaces" ON public.workspaces FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_workspaces" ON public.workspaces FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  project TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  deleted BOOLEAN DEFAULT false,
  favorite BOOLEAN DEFAULT false,
  public_link_token TEXT,
  public_link_enabled BOOLEAN DEFAULT false,
  private BOOLEAN DEFAULT false,
  end_date_estimate DATE
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_projects" ON public.projects FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "insert_own_projects" ON public.projects FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "update_own_projects" ON public.projects FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  );
CREATE POLICY "delete_own_projects" ON public.projects FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  );

-- Phases table
CREATE TABLE public.phases (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  phase TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_phases" ON public.phases FOR SELECT TO authenticated USING (true);

-- Statuses table
CREATE TABLE public.statuses (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  status TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_statuses" ON public.statuses FOR SELECT TO authenticated USING (true);

-- Responsibles table
CREATE TABLE public.responsibles (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  responsible TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.responsibles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_responsibles" ON public.responsibles FOR SELECT TO authenticated USING (true);

-- Tasks main table
CREATE TABLE public.tasks_main (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  task_id INTEGER NOT NULL,
  task_sort INTEGER NOT NULL DEFAULT 0,
  task_name TEXT NOT NULL DEFAULT '',
  depends_on_task_id INTEGER,
  depends_on_task_ids INTEGER[],
  dependencies_task_ids INTEGER[],
  phase_id UUID REFERENCES public.phases(id) ON DELETE SET NULL,
  status_id UUID REFERENCES public.statuses(id) ON DELETE SET NULL,
  responsible_id UUID REFERENCES public.responsibles(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days INTEGER NOT NULL DEFAULT 1,
  end_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_comment TEXT DEFAULT '',
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.tasks_main ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_tasks" ON public.tasks_main FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.user_id = auth.uid()
    )
  );
CREATE POLICY "insert_own_tasks" ON public.tasks_main FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.user_id = auth.uid()
    )
  );
CREATE POLICY "update_own_tasks" ON public.tasks_main FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.user_id = auth.uid()
    )
  );
CREATE POLICY "delete_own_tasks" ON public.tasks_main FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE p.id = project_id AND w.user_id = auth.uid()
    )
  );

-- Tasks sub (subtasks) table
CREATE TABLE public.tasks_sub (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  subtask_sort INTEGER NOT NULL DEFAULT 0,
  task_main_id UUID NOT NULL REFERENCES public.tasks_main(id) ON DELETE CASCADE,
  subtask_name TEXT NOT NULL DEFAULT '',
  not_started BOOLEAN DEFAULT true,
  doing BOOLEAN DEFAULT false,
  done BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.tasks_sub ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_subtasks" ON public.tasks_sub FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tasks_main t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE t.id = task_main_id AND w.user_id = auth.uid()
    )
  );
CREATE POLICY "insert_own_subtasks" ON public.tasks_sub FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks_main t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE t.id = task_main_id AND w.user_id = auth.uid()
    )
  );
CREATE POLICY "update_own_subtasks" ON public.tasks_sub FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tasks_main t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE t.id = task_main_id AND w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks_main t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE t.id = task_main_id AND w.user_id = auth.uid()
    )
  );
CREATE POLICY "delete_own_subtasks" ON public.tasks_sub FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tasks_main t
      JOIN public.projects p ON p.id = t.project_id
      JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE t.id = task_main_id AND w.user_id = auth.uid()
    )
  );

-- Auto-create user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
