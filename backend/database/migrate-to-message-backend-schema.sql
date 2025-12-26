-- ============================================
-- Migration Script: Backend to Message-Backend Schema
-- This script updates the backend database schema to match message-backend
-- Run this script on your existing backend database
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- 1. Update Users Table
-- ============================================

-- Add is_active column if missing
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add profile_photo column if missing (message-backend uses this, not just profile_photo_url)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- Update existing profile_photo_url to profile_photo if profile_photo is null
UPDATE users 
SET profile_photo = profile_photo_url 
WHERE profile_photo IS NULL AND profile_photo_url IS NOT NULL;

-- ============================================
-- 2. Create Profiles Table
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  about TEXT,
  contact_number TEXT,
  profile_photo TEXT,
  company TEXT,
  designation TEXT,
  location TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_contact_number ON profiles(contact_number);

-- Migrate existing user data to profiles if profiles don't exist
INSERT INTO profiles (user_id, about, contact_number, profile_photo, company, designation, location, created_at, updated_at)
SELECT 
  id,
  bio,
  mobile,
  COALESCE(profile_photo, profile_photo_url),
  NULL,
  NULL,
  NULL,
  created_at,
  updated_at
FROM users
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = users.id)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. Update Conversations Table
-- ============================================

-- Ensure conversations table exists with correct structure
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  group_photo TEXT,
  is_task_group BOOLEAN DEFAULT FALSE,
  task_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns if they don't exist
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS group_photo TEXT,
ADD COLUMN IF NOT EXISTS is_task_group BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS task_id UUID,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Migrate data from groups table to conversations if needed
-- This assumes groups table exists and we want to create conversations for them
-- Note: Only migrate if groups table exists and has compatible structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN
    INSERT INTO conversations (id, name, is_group, group_photo, is_task_group, task_id, created_by, created_at, updated_at)
    SELECT 
      id::uuid,
      name,
      TRUE,
      photo_url,
      COALESCE(is_task_group, FALSE),
      task_id::uuid,
      created_by::uuid,
      created_at,
      COALESCE(updated_at, created_at)
    FROM groups
    WHERE NOT EXISTS (SELECT 1 FROM conversations WHERE conversations.id::text = groups.id::text)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 4. Create Conversation Members Table
-- ============================================

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  is_pinned BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id)
);

-- Add missing columns if table already exists
ALTER TABLE conversation_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE conversation_members ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE conversation_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Migrate data from group_members to conversation_members if needed
-- Note: Only migrate if group_members table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_members') THEN
    INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
    SELECT 
      group_id::uuid,
      user_id::uuid,
      role,
      COALESCE(added_at, CURRENT_TIMESTAMP)
    FROM group_members
    WHERE NOT EXISTS (
      SELECT 1 FROM conversation_members 
      WHERE conversation_members.conversation_id::text = group_members.group_id::text
        AND conversation_members.user_id::text = group_members.user_id::text
    )
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
END $$;

-- ============================================
-- 5. Update Messages Table
-- ============================================

-- Add conversation_id column if missing
-- Use UUID to match conversations.id, but also support VARCHAR for 'direct_<userId>' format
-- We'll use TEXT to support both UUID and 'direct_<userId>' formats
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS conversation_id TEXT;

-- Add missing columns from message-backend
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS media_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_for_all BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS is_live_location BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS live_location_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';

-- Migrate existing data: set conversation_id based on receiver_id or group_id
UPDATE messages 
SET conversation_id = CASE
  WHEN receiver_id IS NOT NULL THEN 'direct_' || receiver_id::TEXT
  WHEN group_id IS NOT NULL THEN group_id::TEXT
  ELSE NULL
END
WHERE conversation_id IS NULL;

-- Migrate is_edited to edited_at
UPDATE messages 
SET edited_at = updated_at 
WHERE is_edited = TRUE AND edited_at IS NULL;

-- Migrate is_deleted to deleted_at
UPDATE messages 
SET deleted_at = updated_at 
WHERE is_deleted = TRUE AND deleted_at IS NULL;

-- Migrate deleted_for_everyone to deleted_for_all
UPDATE messages 
SET deleted_for_all = deleted_for_everyone 
WHERE deleted_for_everyone = TRUE AND deleted_for_all = FALSE;

-- Create index on conversation_id
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- ============================================
-- 6. Create Message Reactions Table
-- ============================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

-- ============================================
-- 7. Create Starred Messages Table
-- ============================================

CREATE TABLE IF NOT EXISTS starred_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_starred_messages_user ON starred_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_starred_messages_message ON starred_messages(message_id);

-- Migrate existing is_starred data to starred_messages
INSERT INTO starred_messages (user_id, message_id, created_at)
SELECT 
  sender_id,
  id,
  created_at
FROM messages
WHERE is_starred = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM starred_messages 
    WHERE starred_messages.message_id = messages.id 
      AND starred_messages.user_id = messages.sender_id
  )
ON CONFLICT (user_id, message_id) DO NOTHING;

-- ============================================
-- 8. Create Message Search Table
-- ============================================

CREATE TABLE IF NOT EXISTS message_search (
  message_id UUID PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
  conversation_id TEXT,
  content_tsvector tsvector,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_search_conversation_id ON message_search(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_search_tsvector ON message_search USING GIN(content_tsvector);

-- Populate message_search for existing messages
INSERT INTO message_search (message_id, conversation_id, content_tsvector, created_at)
SELECT 
  id,
  conversation_id,
  to_tsvector('english', COALESCE(content, '')),
  created_at
FROM messages
WHERE content IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM message_search WHERE message_search.message_id = messages.id)
ON CONFLICT (message_id) DO NOTHING;

-- ============================================
-- 9. Create/Update Full-Text Search Trigger
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS messages_search_trigger ON messages;

-- Create trigger function
CREATE OR REPLACE FUNCTION messages_search_update() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO message_search (message_id, conversation_id, content_tsvector, created_at)
  VALUES (NEW.id, NEW.conversation_id, to_tsvector('english', COALESCE(NEW.content, '')), NEW.created_at)
  ON CONFLICT (message_id) 
  DO UPDATE SET 
    conversation_id = NEW.conversation_id,
    content_tsvector = to_tsvector('english', COALESCE(NEW.content, '')),
    created_at = NEW.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER messages_search_trigger
AFTER INSERT OR UPDATE OF content, conversation_id ON messages
FOR EACH ROW
WHEN (NEW.content IS NOT NULL)
EXECUTE FUNCTION messages_search_update();

-- ============================================
-- 10. Update Tasks Table
-- ============================================

-- Ensure tasks table has all required columns
-- Add task_type with default first, then set NOT NULL if needed
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'one_time';

-- Update existing NULL values to default
UPDATE tasks SET task_type = 'one_time' WHERE task_type IS NULL;

-- Add NOT NULL constraint only if column doesn't have it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' 
      AND column_name = 'task_type' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN task_type SET NOT NULL;
  END IF;
END $$;

-- Add other task columns (separate ALTER TABLE statements)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_date TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS next_recurrence_date TIMESTAMP;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_escalate BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escalation_rules JSONB;

-- Add priority column if it doesn't exist (message-backend uses this)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

-- Update existing NULL values to default
UPDATE tasks SET priority = 'medium' WHERE priority IS NULL;

-- Add created_by column if it doesn't exist (message-backend uses this, backend uses creator_id)
-- Map creator_id to created_by for compatibility
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- If created_by is NULL but creator_id exists, copy the value
UPDATE tasks SET created_by = creator_id WHERE created_by IS NULL AND creator_id IS NOT NULL;

-- Add check constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_task_type_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_task_type_check 
      CHECK (task_type IN ('one_time', 'recurring'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
      CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_priority_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
      CHECK (priority IN ('high', 'medium', 'low'));
  END IF;
END $$;

-- ============================================
-- 11. Create/Update Task Assignees Table
-- ============================================

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  PRIMARY KEY (task_id, user_id)
);

-- Add missing columns if they exist in old schema
ALTER TABLE task_assignees 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);

-- ============================================
-- 12. Create/Update Task Activities Table
-- ============================================

CREATE TABLE IF NOT EXISTS task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_user ON task_activities(user_id);

-- Migrate from task_status_logs if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_status_logs') THEN
    INSERT INTO task_activities (task_id, user_id, activity_type, old_value, new_value, message, created_at)
    SELECT 
      tsl.task_id,
      tsl.changed_by_user_id,  -- task_status_logs uses changed_by_user_id, not user_id
      'status_changed',
      tsl.old_status,
      tsl.new_status,
      COALESCE(tsl.change_reason, 'Status changed'),
      tsl.created_at
    FROM task_status_logs tsl
    WHERE NOT EXISTS (
      SELECT 1 FROM task_activities ta
      WHERE ta.task_id = tsl.task_id 
        AND ta.created_at = tsl.created_at
    );
  END IF;
END $$;

-- ============================================
-- 13. Update Notifications Table
-- ============================================

-- Ensure notifications table has conversation_id and message_id
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE CASCADE;

-- ============================================
-- 14. Create Additional Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conv ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_pinned ON conversation_members(user_id, is_pinned) WHERE is_pinned = TRUE;
-- Create index on created_by (we just added it above, so it should exist)
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- Also create index on creator_id if it exists (for backward compatibility)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'creator_id') THEN
    CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);

-- ============================================
-- Migration Complete
-- ============================================

-- Note: The following columns in messages table are kept for backward compatibility
-- but should not be used in new code:
-- - receiver_id (use conversation_id with 'direct_' prefix instead)
-- - group_id (use conversation_id with UUID instead)
-- - organization_id (not used in message-backend)
-- - is_edited (use edited_at instead)
-- - is_deleted (use deleted_at instead)
-- - deleted_for_everyone (use deleted_for_all instead)
-- - is_starred (use starred_messages table instead)

