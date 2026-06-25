-- Per-message read tracking for project discussion
-- Each row records that a specific user has read a specific comment.

CREATE TABLE IF NOT EXISTS project_comment_reads (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES project_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_project_comment_reads_user_id ON project_comment_reads (user_id);
CREATE INDEX IF NOT EXISTS idx_project_comment_reads_comment_id ON project_comment_reads (comment_id);

ALTER TABLE project_comment_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_reads_select_own" ON project_comment_reads;
CREATE POLICY "comment_reads_select_own" ON project_comment_reads FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "comment_reads_insert_own" ON project_comment_reads;
CREATE POLICY "comment_reads_insert_own" ON project_comment_reads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comment_reads_delete_own" ON project_comment_reads;
CREATE POLICY "comment_reads_delete_own" ON project_comment_reads FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
