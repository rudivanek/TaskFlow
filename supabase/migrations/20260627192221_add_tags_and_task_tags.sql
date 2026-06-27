/*
# Add Tags system

Adds per-task tagging with global and project-scoped tags.

1. New Tables
- `tags`
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `color` (text, not null, default '#3b82f6')
  - `project_id` (uuid, nullable fk projects) — null = global tag
  - `created_by` (uuid, nullable fk auth.users)
  - `created_at` (timestamptz)

- `task_tags` — junction table
  - `task_id` (uuid, fk tasks_main, cascade delete)
  - `tag_id` (uuid, fk tags, cascade delete)
  - composite PK (task_id, tag_id)
  - `created_at` (timestamptz)

2. Security
- tags: authenticated SELECT + INSERT; creator DELETE.
- task_tags: authenticated SELECT + INSERT + DELETE.

3. Seed Data
- 8 default global tags seeded idempotently.
*/

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_tags" ON tags;
CREATE POLICY "authenticated_select_tags" ON tags FOR SELECT
  TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_insert_tags" ON tags;
CREATE POLICY "authenticated_insert_tags" ON tags FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "creator_delete_tags" ON tags;
CREATE POLICY "creator_delete_tags" ON tags FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_tags (
  task_id uuid NOT NULL REFERENCES tasks_main(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES tags(id)        ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, tag_id)
);

ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_task_tags" ON task_tags;
CREATE POLICY "authenticated_select_task_tags" ON task_tags FOR SELECT
  TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_insert_task_tags" ON task_tags;
CREATE POLICY "authenticated_insert_task_tags" ON task_tags FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "authenticated_delete_task_tags" ON task_tags;
CREATE POLICY "authenticated_delete_task_tags" ON task_tags FOR DELETE
  TO authenticated USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed default global tags (idempotent)

INSERT INTO tags (name, color, project_id, created_by)
SELECT v.name, v.color, NULL, NULL
FROM (VALUES
  ('Urgent',      '#ef4444'),
  ('Review',      '#f59e0b'),
  ('Approved',    '#22c55e'),
  ('Blocked',     '#dc2626'),
  ('In Progress', '#3b82f6'),
  ('Design',      '#8b5cf6'),
  ('Dev',         '#06b6d4'),
  ('Client',      '#f97316')
) AS v(name, color)
WHERE NOT EXISTS (
  SELECT 1 FROM tags t WHERE t.name = v.name AND t.project_id IS NULL
);
