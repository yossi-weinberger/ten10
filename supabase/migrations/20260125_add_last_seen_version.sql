-- Migration: Add last_seen_version column to profiles table
-- This column tracks the last app version the user has seen in the "What's New" modal
-- Used to show new features/improvements only once per version

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_seen_version VARCHAR(10) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.last_seen_version IS 'Tracks the last app version shown in the What''s New modal';
