-- Add author_name and task_id to project_comments.
-- task_id references tasks_main (the actual table name in this schema).
ALTER TABLE public.project_comments
  ADD COLUMN IF NOT EXISTS author_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.tasks_main(id) ON DELETE SET NULL;
