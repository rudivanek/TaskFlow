-- Replace all ownership-scoped policies with shared access for all authenticated users.
-- Any logged-in user can read and write all workspaces, projects, tasks, subtasks, and comments.

-- ── users ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_own_user" ON public.users;
DROP POLICY IF EXISTS "insert_own_user" ON public.users;
DROP POLICY IF EXISTS "update_own_user" ON public.users;
DROP POLICY IF EXISTS "delete_own_user" ON public.users;

CREATE POLICY "select_all_users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_user" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_user" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_user" ON public.users FOR DELETE TO authenticated USING (auth.uid() = id);

-- ── workspaces ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_own_workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "insert_own_workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "update_own_workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "delete_own_workspaces" ON public.workspaces;

CREATE POLICY "select_all_workspaces" ON public.workspaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_all_workspaces" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_all_workspaces" ON public.workspaces FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_workspaces" ON public.workspaces FOR DELETE TO authenticated USING (true);

-- ── projects ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_own_projects" ON public.projects;
DROP POLICY IF EXISTS "insert_own_projects" ON public.projects;
DROP POLICY IF EXISTS "update_own_projects" ON public.projects;
DROP POLICY IF EXISTS "delete_own_projects" ON public.projects;

CREATE POLICY "select_all_projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_all_projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_all_projects" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_projects" ON public.projects FOR DELETE TO authenticated USING (true);

-- ── tasks_main ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_own_tasks" ON public.tasks_main;
DROP POLICY IF EXISTS "insert_own_tasks" ON public.tasks_main;
DROP POLICY IF EXISTS "update_own_tasks" ON public.tasks_main;
DROP POLICY IF EXISTS "delete_own_tasks" ON public.tasks_main;

CREATE POLICY "select_all_tasks" ON public.tasks_main FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_all_tasks" ON public.tasks_main FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_all_tasks" ON public.tasks_main FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_tasks" ON public.tasks_main FOR DELETE TO authenticated USING (true);

-- ── tasks_sub ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_own_subtasks" ON public.tasks_sub;
DROP POLICY IF EXISTS "insert_own_subtasks" ON public.tasks_sub;
DROP POLICY IF EXISTS "update_own_subtasks" ON public.tasks_sub;
DROP POLICY IF EXISTS "delete_own_subtasks" ON public.tasks_sub;

CREATE POLICY "select_all_subtasks" ON public.tasks_sub FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_all_subtasks" ON public.tasks_sub FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_all_subtasks" ON public.tasks_sub FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_subtasks" ON public.tasks_sub FOR DELETE TO authenticated USING (true);

-- ── project_comments ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "select_own_project_comments" ON public.project_comments;
DROP POLICY IF EXISTS "insert_own_project_comments" ON public.project_comments;
DROP POLICY IF EXISTS "update_own_project_comments" ON public.project_comments;
DROP POLICY IF EXISTS "delete_own_project_comments" ON public.project_comments;

CREATE POLICY "select_all_project_comments" ON public.project_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_all_project_comments" ON public.project_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_all_project_comments" ON public.project_comments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_project_comments" ON public.project_comments FOR DELETE TO authenticated USING (true);
