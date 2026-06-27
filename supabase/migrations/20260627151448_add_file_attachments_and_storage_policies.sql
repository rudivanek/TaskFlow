
-- Add file_attachments to chat_messages
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS file_attachments JSONB NOT NULL DEFAULT '[]';

-- Add file_attachments to project_comments
ALTER TABLE project_comments
  ADD COLUMN IF NOT EXISTS file_attachments JSONB NOT NULL DEFAULT '[]';

-- Storage policies for chat-attachments bucket
CREATE POLICY "Authenticated users can upload chat attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone can view chat attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete their own chat attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
