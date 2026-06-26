-- =============================================================================
-- FULL DATABASE BACKUP
-- Project: Task Manager (Bolt.new)
-- Generated: 2026-06-26
-- =============================================================================
-- HOW TO RESTORE:
--   1. Create a fresh Supabase project at supabase.com
--   2. Open the SQL Editor in your Supabase dashboard
--   3. Paste the entire contents of this file and click Run
--   4. Done — all tables, policies, functions, and data will be restored
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- =============================================================================
-- TABLES
-- =============================================================================

-- users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  is_test_user BOOLEAN DEFAULT false
);

-- workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  workspace TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  private BOOLEAN DEFAULT false,
  show_in_time_estimates BOOLEAN DEFAULT true
);

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  project TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  deleted BOOLEAN DEFAULT false,
  favorite BOOLEAN DEFAULT false,
  public_link_token TEXT,
  public_link_enabled BOOLEAN DEFAULT false,
  private BOOLEAN DEFAULT false,
  end_date_estimate DATE,
  include_in_chat BOOLEAN NOT NULL DEFAULT false
);

-- phases
CREATE TABLE IF NOT EXISTS public.phases (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  phase TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- statuses
CREATE TABLE IF NOT EXISTS public.statuses (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  status TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- responsibles
CREATE TABLE IF NOT EXISTS public.responsibles (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  responsible TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- tasks_main
CREATE TABLE IF NOT EXISTS public.tasks_main (
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

-- tasks_sub
CREATE TABLE IF NOT EXISTS public.tasks_sub (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  subtask_sort INTEGER NOT NULL DEFAULT 0,
  task_main_id UUID NOT NULL REFERENCES public.tasks_main(id) ON DELETE CASCADE,
  subtask_name TEXT NOT NULL DEFAULT '',
  not_started BOOLEAN DEFAULT true,
  doing BOOLEAN DEFAULT false,
  done BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- project_comments
CREATE TABLE IF NOT EXISTS public.project_comments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  author_name TEXT NOT NULL DEFAULT '',
  task_id UUID REFERENCES public.tasks_main(id) ON DELETE SET NULL,
  notify_all BOOLEAN NOT NULL DEFAULT true,
  notified_user_ids UUID[] NOT NULL DEFAULT '{}',
  parent_id UUID REFERENCES public.project_comments(id) ON DELETE CASCADE,
  image_urls TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_project_comments_parent_id ON public.project_comments(parent_id);

-- project_notes
CREATE TABLE IF NOT EXISTS public.project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_notes_project_id_idx ON public.project_notes(project_id);

-- project_comments_read (last-read timestamp per user per project)
CREATE TABLE IF NOT EXISTS public.project_comments_read (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

-- project_comment_reads (per-message read receipts)
CREATE TABLE IF NOT EXISTS public.project_comment_reads (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.project_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_project_comment_reads_user_id ON public.project_comment_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_project_comment_reads_comment_id ON public.project_comment_reads(comment_id);

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sound_enabled BOOLEAN NOT NULL DEFAULT true
);

-- chat_channels
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('general', 'project')),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id)
);

-- chat_direct_conversations
CREATE TABLE IF NOT EXISTS public.chat_direct_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a_id, user_b_id)
);

-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chat_direct_conversations(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (channel_id IS NOT NULL AND conversation_id IS NULL) OR
    (channel_id IS NULL AND conversation_id IS NOT NULL)
  )
);

-- chat_read_receipts
CREATE TABLE IF NOT EXISTS public.chat_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chat_direct_conversations(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (channel_id IS NOT NULL AND conversation_id IS NULL) OR
    (channel_id IS NULL AND conversation_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS crr_channel_uniq ON public.chat_read_receipts(user_id, channel_id) WHERE channel_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS crr_conv_uniq ON public.chat_read_receipts(user_id, conversation_id) WHERE conversation_id IS NOT NULL;

-- message_reminders
CREATE TABLE IF NOT EXISTS public.message_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.project_comments(id) ON DELETE CASCADE,
  message_preview TEXT NOT NULL,
  message_author TEXT NOT NULL,
  remind_at TIMESTAMPTZ NOT NULL,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (message_id IS NOT NULL AND comment_id IS NULL) OR
    (message_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_main ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_sub ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comments_read ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_comment_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reminders ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- users
DROP POLICY IF EXISTS "select_all_users" ON public.users;
DROP POLICY IF EXISTS "insert_own_user" ON public.users;
DROP POLICY IF EXISTS "update_own_user" ON public.users;
DROP POLICY IF EXISTS "delete_own_user" ON public.users;

CREATE POLICY "select_all_users" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_user" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_user" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_user" ON public.users FOR DELETE TO authenticated USING (auth.uid() = id);

-- workspaces
DROP POLICY IF EXISTS "select_all_workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "insert_all_workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "update_all_workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "delete_all_workspaces" ON public.workspaces;

CREATE POLICY "select_all_workspaces" ON public.workspaces FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_all_workspaces" ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_all_workspaces" ON public.workspaces FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_workspaces" ON public.workspaces FOR DELETE TO authenticated USING (true);

-- projects
DROP POLICY IF EXISTS "select_all_projects" ON public.projects;
DROP POLICY IF EXISTS "insert_all_projects" ON public.projects;
DROP POLICY IF EXISTS "update_all_projects" ON public.projects;
DROP POLICY IF EXISTS "delete_all_projects" ON public.projects;

CREATE POLICY "select_all_projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_all_projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_all_projects" ON public.projects FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_projects" ON public.projects FOR DELETE TO authenticated USING (true);

-- phases
DROP POLICY IF EXISTS "select_phases" ON public.phases;
CREATE POLICY "select_phases" ON public.phases FOR SELECT TO authenticated USING (true);

-- statuses
DROP POLICY IF EXISTS "select_statuses" ON public.statuses;
CREATE POLICY "select_statuses" ON public.statuses FOR SELECT TO authenticated USING (true);

-- responsibles
DROP POLICY IF EXISTS "select_responsibles" ON public.responsibles;
CREATE POLICY "select_responsibles" ON public.responsibles FOR SELECT TO authenticated USING (true);

-- tasks_main
DROP POLICY IF EXISTS "select_all_tasks" ON public.tasks_main;
DROP POLICY IF EXISTS "insert_all_tasks" ON public.tasks_main;
DROP POLICY IF EXISTS "update_all_tasks" ON public.tasks_main;
DROP POLICY IF EXISTS "delete_all_tasks" ON public.tasks_main;

CREATE POLICY "select_all_tasks" ON public.tasks_main FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_all_tasks" ON public.tasks_main FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_all_tasks" ON public.tasks_main FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_tasks" ON public.tasks_main FOR DELETE TO authenticated USING (true);

-- tasks_sub
DROP POLICY IF EXISTS "select_all_subtasks" ON public.tasks_sub;
DROP POLICY IF EXISTS "insert_all_subtasks" ON public.tasks_sub;
DROP POLICY IF EXISTS "update_all_subtasks" ON public.tasks_sub;
DROP POLICY IF EXISTS "delete_all_subtasks" ON public.tasks_sub;

CREATE POLICY "select_all_subtasks" ON public.tasks_sub FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_all_subtasks" ON public.tasks_sub FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_all_subtasks" ON public.tasks_sub FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_subtasks" ON public.tasks_sub FOR DELETE TO authenticated USING (true);

-- project_comments
DROP POLICY IF EXISTS "select_all_project_comments" ON public.project_comments;
DROP POLICY IF EXISTS "insert_all_project_comments" ON public.project_comments;
DROP POLICY IF EXISTS "update_all_project_comments" ON public.project_comments;
DROP POLICY IF EXISTS "delete_all_project_comments" ON public.project_comments;

CREATE POLICY "select_all_project_comments" ON public.project_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_all_project_comments" ON public.project_comments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_all_project_comments" ON public.project_comments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_project_comments" ON public.project_comments FOR DELETE TO authenticated USING (true);

-- project_notes
DROP POLICY IF EXISTS "notes_select_authenticated" ON public.project_notes;
DROP POLICY IF EXISTS "notes_insert_authenticated" ON public.project_notes;
DROP POLICY IF EXISTS "notes_update_own" ON public.project_notes;
DROP POLICY IF EXISTS "notes_delete_own" ON public.project_notes;

CREATE POLICY "notes_select_authenticated" ON public.project_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes_insert_authenticated" ON public.project_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update_own" ON public.project_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_delete_own" ON public.project_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- project_comments_read
DROP POLICY IF EXISTS "read_receipts_select_own" ON public.project_comments_read;
DROP POLICY IF EXISTS "read_receipts_insert_own" ON public.project_comments_read;
DROP POLICY IF EXISTS "read_receipts_update_own" ON public.project_comments_read;

CREATE POLICY "read_receipts_select_own" ON public.project_comments_read FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "read_receipts_insert_own" ON public.project_comments_read FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "read_receipts_update_own" ON public.project_comments_read FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- project_comment_reads
DROP POLICY IF EXISTS "comment_reads_select_own" ON public.project_comment_reads;
DROP POLICY IF EXISTS "comment_reads_insert_own" ON public.project_comment_reads;
DROP POLICY IF EXISTS "comment_reads_delete_own" ON public.project_comment_reads;
DROP POLICY IF EXISTS "comment_reads_update_own" ON public.project_comment_reads;

CREATE POLICY "comment_reads_select_own" ON public.project_comment_reads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "comment_reads_insert_own" ON public.project_comment_reads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comment_reads_delete_own" ON public.project_comment_reads FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "comment_reads_update_own" ON public.project_comment_reads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- profiles
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- chat_channels
DROP POLICY IF EXISTS "auth_read_channels" ON public.chat_channels;
DROP POLICY IF EXISTS "auth_insert_channels" ON public.chat_channels;
DROP POLICY IF EXISTS "auth_delete_channels" ON public.chat_channels;

CREATE POLICY "auth_read_channels" ON public.chat_channels FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_insert_channels" ON public.chat_channels FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth_delete_channels" ON public.chat_channels FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- chat_direct_conversations
DROP POLICY IF EXISTS "auth_read_dm_convs" ON public.chat_direct_conversations;
DROP POLICY IF EXISTS "auth_insert_dm_convs" ON public.chat_direct_conversations;

CREATE POLICY "auth_read_dm_convs" ON public.chat_direct_conversations FOR SELECT TO authenticated USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE POLICY "auth_insert_dm_convs" ON public.chat_direct_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- chat_messages
DROP POLICY IF EXISTS "auth_read_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "auth_insert_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "auth_delete_own_messages" ON public.chat_messages;

CREATE POLICY "auth_read_messages" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_insert_messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "auth_delete_own_messages" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- chat_read_receipts
DROP POLICY IF EXISTS "auth_select_receipts" ON public.chat_read_receipts;
DROP POLICY IF EXISTS "auth_insert_receipts" ON public.chat_read_receipts;
DROP POLICY IF EXISTS "auth_update_receipts" ON public.chat_read_receipts;
DROP POLICY IF EXISTS "auth_delete_receipts" ON public.chat_read_receipts;

CREATE POLICY "auth_select_receipts" ON public.chat_read_receipts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "auth_insert_receipts" ON public.chat_read_receipts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_update_receipts" ON public.chat_read_receipts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "auth_delete_receipts" ON public.chat_read_receipts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- message_reminders
DROP POLICY IF EXISTS "reminders_select_own" ON public.message_reminders;
DROP POLICY IF EXISTS "reminders_insert_own" ON public.message_reminders;
DROP POLICY IF EXISTS "reminders_update_own" ON public.message_reminders;
DROP POLICY IF EXISTS "reminders_delete_own" ON public.message_reminders;

CREATE POLICY "reminders_select_own" ON public.message_reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reminders_insert_own" ON public.message_reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reminders_update_own" ON public.message_reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "reminders_delete_own" ON public.message_reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_next_task_id_for_project(project_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(task_id), 0) + 1 INTO next_id
  FROM public.tasks_main
  WHERE project_id = project_id_param;
  RETURN next_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_multiple_dependencies(
  p_task_id UUID,
  p_depends_on_task_ids INTEGER[],
  p_project_id UUID
)
RETURNS SETOF public.tasks_main AS $$
DECLARE
  v_task RECORD;
  v_dep_task RECORD;
  v_max_end_date DATE;
  v_new_start DATE;
  v_task_task_id INTEGER;
  v_old_depends INTEGER[];
  v_dep_id INTEGER;
BEGIN
  SELECT task_id, depends_on_task_ids INTO v_task_task_id, v_old_depends
  FROM public.tasks_main WHERE id = p_task_id;

  IF v_task_task_id = ANY(p_depends_on_task_ids) THEN
    RAISE EXCEPTION 'A task cannot depend on itself';
  END IF;

  FOR v_dep_id IN SELECT unnest(p_depends_on_task_ids) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks_main
      WHERE task_id = v_dep_id AND project_id = p_project_id
    ) THEN
      RAISE EXCEPTION 'Task #% does not exist in this project', v_dep_id;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.tasks_main
    WHERE project_id = p_project_id
      AND task_id = ANY(p_depends_on_task_ids)
      AND v_task_task_id = ANY(depends_on_task_ids)
  ) THEN
    RAISE EXCEPTION 'Circular dependency detected';
  END IF;

  IF v_old_depends IS NOT NULL AND array_length(v_old_depends, 1) > 0 THEN
    UPDATE public.tasks_main
    SET dependencies_task_ids = array_remove(dependencies_task_ids, v_task_task_id)
    WHERE project_id = p_project_id AND task_id = ANY(v_old_depends);
  END IF;

  IF array_length(p_depends_on_task_ids, 1) > 0 THEN
    UPDATE public.tasks_main
    SET dependencies_task_ids = array_append(
      COALESCE(dependencies_task_ids, ARRAY[]::INTEGER[]),
      v_task_task_id
    )
    WHERE project_id = p_project_id AND task_id = ANY(p_depends_on_task_ids)
      AND NOT (v_task_task_id = ANY(COALESCE(dependencies_task_ids, ARRAY[]::INTEGER[])));
  END IF;

  IF array_length(p_depends_on_task_ids, 1) > 0 THEN
    SELECT MAX(end_date) INTO v_max_end_date
    FROM public.tasks_main
    WHERE project_id = p_project_id AND task_id = ANY(p_depends_on_task_ids);

    IF v_max_end_date IS NOT NULL THEN
      v_new_start := v_max_end_date + INTERVAL '1 day';
      UPDATE public.tasks_main
      SET depends_on_task_ids = p_depends_on_task_ids,
          depends_on_task_id = p_depends_on_task_ids[1],
          start_date = v_new_start,
          end_date = v_new_start + (days - 1) * INTERVAL '1 day'
      WHERE id = p_task_id;
    ELSE
      UPDATE public.tasks_main
      SET depends_on_task_ids = p_depends_on_task_ids,
          depends_on_task_id = p_depends_on_task_ids[1]
      WHERE id = p_task_id;
    END IF;
  ELSE
    UPDATE public.tasks_main
    SET depends_on_task_ids = NULL,
        depends_on_task_id = NULL
    WHERE id = p_task_id;
  END IF;

  RETURN QUERY SELECT * FROM public.tasks_main WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cascade_dependency_dates(p_task_id UUID)
RETURNS SETOF public.tasks_main AS $$
DECLARE
  v_task RECORD;
  v_dep_task RECORD;
  v_queue UUID[];
  v_current UUID;
  v_updated_ids UUID[] := ARRAY[]::UUID[];
  v_max_end_date DATE;
  v_new_start DATE;
  v_dep_task_ids INTEGER[];
BEGIN
  SELECT * INTO v_task FROM public.tasks_main WHERE id = p_task_id;

  v_queue := ARRAY(
    SELECT id FROM public.tasks_main
    WHERE project_id = v_task.project_id
      AND v_task.task_id = ANY(depends_on_task_ids)
  );

  WHILE array_length(v_queue, 1) > 0 LOOP
    v_current := v_queue[1];
    v_queue := v_queue[2:];

    SELECT * INTO v_dep_task FROM public.tasks_main WHERE id = v_current;

    SELECT MAX(end_date) INTO v_max_end_date
    FROM public.tasks_main
    WHERE project_id = v_dep_task.project_id
      AND task_id = ANY(v_dep_task.depends_on_task_ids);

    IF v_max_end_date IS NOT NULL THEN
      v_new_start := v_max_end_date + INTERVAL '1 day';

      IF v_new_start != v_dep_task.start_date THEN
        UPDATE public.tasks_main
        SET start_date = v_new_start,
            end_date = v_new_start + (days - 1) * INTERVAL '1 day'
        WHERE id = v_current;

        v_updated_ids := array_append(v_updated_ids, v_current);

        v_queue := v_queue || ARRAY(
          SELECT t.id FROM public.tasks_main t
          WHERE t.project_id = v_dep_task.project_id
            AND v_dep_task.task_id = ANY(t.depends_on_task_ids)
            AND NOT (t.id = ANY(v_updated_ids))
        );
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT * FROM public.tasks_main WHERE id = ANY(v_updated_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.duplicate_project(p_project_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_project RECORD;
  v_new_project_id UUID;
  v_task RECORD;
  v_new_task_id UUID;
  v_subtask RECORD;
BEGIN
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id;

  INSERT INTO public.projects (project, workspace_id, deleted, favorite, private)
  VALUES (v_project.project || ' (Copy)', v_project.workspace_id, false, false, v_project.private)
  RETURNING id INTO v_new_project_id;

  FOR v_task IN SELECT * FROM public.tasks_main WHERE project_id = p_project_id ORDER BY task_sort LOOP
    INSERT INTO public.tasks_main (
      task_id, task_sort, task_name, depends_on_task_id, depends_on_task_ids,
      dependencies_task_ids, phase_id, status_id, responsible_id,
      start_date, days, end_date, task_comment, project_id, user_id
    ) VALUES (
      v_task.task_id, v_task.task_sort, v_task.task_name, v_task.depends_on_task_id,
      v_task.depends_on_task_ids, v_task.dependencies_task_ids, v_task.phase_id,
      v_task.status_id, v_task.responsible_id, v_task.start_date, v_task.days,
      v_task.end_date, v_task.task_comment, v_new_project_id, v_task.user_id
    ) RETURNING id INTO v_new_task_id;

    FOR v_subtask IN SELECT * FROM public.tasks_sub WHERE task_main_id = v_task.id LOOP
      INSERT INTO public.tasks_sub (subtask_sort, task_main_id, subtask_name, not_started, doing, done, user_id)
      VALUES (v_subtask.subtask_sort, v_new_task_id, v_subtask.subtask_name, v_subtask.not_started, v_subtask.doing, v_subtask.done, v_subtask.user_id);
    END LOOP;
  END LOOP;

  RETURN v_new_project_id::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_comments;

-- =============================================================================
-- STORAGE
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('discussion-images', 'discussion-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload discussion images" ON storage.objects;
CREATE POLICY "Authenticated users can upload discussion images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'discussion-images');

DROP POLICY IF EXISTS "Anyone can view discussion images" ON storage.objects;
CREATE POLICY "Anyone can view discussion images"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'discussion-images');

DROP POLICY IF EXISTS "Users can delete their own discussion images" ON storage.objects;
CREATE POLICY "Users can delete their own discussion images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'discussion-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- =============================================================================
-- SEED DATA — LOOKUP TABLES
-- =============================================================================

INSERT INTO public.phases (id, phase, sort_order) VALUES
  ('792c3ba5-3359-4df7-9d16-a5379b7a4e67', 'Planning',    1),
  ('aba10350-b186-43d2-8ce0-0a3043ed8d5c', 'Design',      2),
  ('a8f3b795-5774-4f0c-9d5f-dc89aaba80c7', 'Development', 3),
  ('de8bb44d-505c-4ca0-9a0d-922242f924ee', 'Testing',     4),
  ('5b2536ce-c600-4753-b42b-d839170ce57e', 'Deployment',  5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.statuses (id, status, sort_order) VALUES
  ('350f5cd9-2114-4bb2-8ff5-5ee1f69f4e3e', 'Not Started', 1),
  ('fda9b8f8-85a6-4696-8837-fb728cec489d', 'In Progress',  2),
  ('1c6ce643-952a-40cf-88c6-1fe83f121e3f', 'In Review',    3),
  ('a37ad099-369a-4c9f-b32d-78a2cee72619', 'Blocked',      4),
  ('a24202fd-9bbd-4365-b573-3e93c8692525', 'Done',         5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.responsibles (id, responsible, sort_order) VALUES
  ('eba79ab0-64ad-4b73-b6e6-eccb831c91d9', 'Team Lead',       1),
  ('72204c77-204a-463b-8a6e-1a5cf1944837', 'Developer',       2),
  ('d5b4f380-3a06-4b60-8fdb-2a6021df698e', 'Designer',        3),
  ('25af7d27-b6b3-4c16-aede-218d3cb4b2e6', 'QA Engineer',     4),
  ('044017f8-e885-4cc3-af23-7c3e48dd10d1', 'Product Manager', 5)
ON CONFLICT (id) DO NOTHING;

-- General chat channel
INSERT INTO public.chat_channels (name, type)
VALUES ('General', 'general')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- NOTE ON USER DATA
-- =============================================================================
-- The tables below hold your real project data (users, workspaces, projects,
-- tasks, comments, etc.). They are empty in this backup because this script
-- was generated from the Bolt sandbox environment.
--
-- TO EXPORT YOUR LIVE DATA:
--   Option A (recommended): In your Supabase dashboard go to
--     Database > Backups and download a point-in-time backup.
--   Option B: Use the Supabase SQL Editor to run:
--     SELECT * FROM public.workspaces;   -- copy results
--     SELECT * FROM public.projects;
--     SELECT * FROM public.tasks_main;
--     SELECT * FROM public.tasks_sub;
--     SELECT * FROM public.project_comments;
--     SELECT * FROM public.project_notes;
--   Then generate INSERT statements from the exported CSV/JSON.
-- =============================================================================
