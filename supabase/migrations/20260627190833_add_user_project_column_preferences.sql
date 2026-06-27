/*
# Create user_project_column_preferences table

Stores per-user, per-project column visibility preferences for the task grid.

1. New Tables
- `user_project_column_preferences`
  - `id` (uuid, primary key)
  - `user_id` (uuid, fk auth.users, defaults to auth.uid())
  - `project_id` (uuid, fk projects, on delete cascade)
  - `visible_columns` (text[], the ordered list of visible column keys)
  - `created_at` / `updated_at` (timestamptz)
  - Unique constraint on (user_id, project_id) so upsert works cleanly.

2. Security
- RLS enabled.
- Four separate policies (SELECT, INSERT, UPDATE, DELETE) scoped to authenticated users
  who own the row (auth.uid() = user_id).
*/

CREATE TABLE IF NOT EXISTS user_project_column_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visible_columns text[] NOT NULL DEFAULT ARRAY[
    'phase', 'status', 'responsible', 'start', 'days', 'end', 'depends_on', 'comments'
  ],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id)
);

ALTER TABLE user_project_column_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_col_prefs" ON user_project_column_preferences;
CREATE POLICY "select_own_col_prefs" ON user_project_column_preferences FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_col_prefs" ON user_project_column_preferences;
CREATE POLICY "insert_own_col_prefs" ON user_project_column_preferences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_col_prefs" ON user_project_column_preferences;
CREATE POLICY "update_own_col_prefs" ON user_project_column_preferences FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_col_prefs" ON user_project_column_preferences;
CREATE POLICY "delete_own_col_prefs" ON user_project_column_preferences FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
