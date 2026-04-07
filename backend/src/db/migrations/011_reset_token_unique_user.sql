-- Add unique constraint on user_id so ON CONFLICT (user_id) DO UPDATE works
-- This ensures each user can have only one active reset token at a time

-- First delete stale/used tokens to avoid constraint violation on existing duplicates
DELETE FROM password_reset_tokens
WHERE used = TRUE OR expires_at < NOW();

-- Keep only the most recent token per user (in case of duplicates)
DELETE FROM password_reset_tokens
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM password_reset_tokens
  ORDER BY user_id, created_at DESC
);

-- Add the unique constraint
ALTER TABLE password_reset_tokens
  ADD CONSTRAINT password_reset_tokens_user_id_key UNIQUE (user_id);
