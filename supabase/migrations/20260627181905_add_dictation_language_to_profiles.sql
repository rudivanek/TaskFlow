ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dictation_language text NOT NULL DEFAULT 'en-US';
