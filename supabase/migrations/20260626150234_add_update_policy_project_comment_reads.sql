CREATE POLICY "comment_reads_update_own" ON project_comment_reads FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
