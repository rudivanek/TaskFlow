/*
# Create project_notes table

A completely separate notes feature for projects, independent from the project_comments/Discussion system.

1. New Tables
   - `project_notes`
     - `id` (uuid, primary key)
     - `project_id` (uuid, FK to projects)
     - `user_id` (uuid, FK to auth.users, defaults to auth.uid())
     - `author_name` (text)
     - `content` (text, not null)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

2. Security
   - RLS enabled.
   - All authenticated users can SELECT and INSERT (shared project space).
   - Only the author can UPDATE or DELETE their own notes.
*/

CREATE TABLE IF NOT EXISTS project_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_notes_project_id_idx ON project_notes(project_id);

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_authenticated" ON project_notes;
CREATE POLICY "notes_select_authenticated" ON project_notes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "notes_insert_authenticated" ON project_notes;
CREATE POLICY "notes_insert_authenticated" ON project_notes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_update_own" ON project_notes;
CREATE POLICY "notes_update_own" ON project_notes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_delete_own" ON project_notes;
CREATE POLICY "notes_delete_own" ON project_notes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
