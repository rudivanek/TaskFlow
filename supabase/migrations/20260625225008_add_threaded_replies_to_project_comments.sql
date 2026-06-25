ALTER TABLE project_comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES project_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_project_comments_parent_id
  ON project_comments(parent_id);
