/*
# Create project_comments_read table

Tracks when each user last read the discussion for a given project.
Used to compute unread comment counts per user per project.

1. New Tables
   - `project_comments_read`
     - `user_id` (uuid, PK part 1, FK to auth.users)
     - `project_id` (uuid, PK part 2, FK to projects)
     - `last_read_at` (timestamptz, defaults to now)

2. Security
   - RLS enabled.
   - Users can only SELECT, INSERT, and UPDATE their own read receipts.
*/

CREATE TABLE IF NOT EXISTS project_comments_read (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);

ALTER TABLE project_comments_read ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_receipts_select_own" ON project_comments_read;
CREATE POLICY "read_receipts_select_own" ON project_comments_read FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "read_receipts_insert_own" ON project_comments_read;
CREATE POLICY "read_receipts_insert_own" ON project_comments_read FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "read_receipts_update_own" ON project_comments_read;
CREATE POLICY "read_receipts_update_own" ON project_comments_read FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
