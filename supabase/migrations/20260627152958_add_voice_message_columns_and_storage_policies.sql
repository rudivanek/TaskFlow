
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS voice_message JSONB;

ALTER TABLE project_comments
  ADD COLUMN IF NOT EXISTS voice_message JSONB;

CREATE POLICY "Authenticated users can upload voice messages"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'voice-messages');

CREATE POLICY "Anyone can listen to voice messages"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'voice-messages');

CREATE POLICY "Users can delete their own voice messages"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice-messages'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
