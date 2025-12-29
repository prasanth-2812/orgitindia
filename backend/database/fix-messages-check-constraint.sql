-- ============================================
-- Fix messages_check constraint to support conversation_id
-- ============================================
-- This updates the CHECK constraint to allow conversation_id to satisfy it
-- when using the new schema (conversations table instead of groups table)

-- Drop the old constraint if it exists
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_check;

-- Add new constraint that allows:
-- 1. Old schema: receiver_id OR group_id (for backward compatibility)
-- 2. New schema: conversation_id (for new conversations-based messages)
ALTER TABLE messages ADD CONSTRAINT messages_check CHECK (
    -- Old schema: either receiver_id or group_id must be set
    (receiver_id IS NOT NULL AND group_id IS NULL) OR
    (receiver_id IS NULL AND group_id IS NOT NULL) OR
    -- New schema: conversation_id can be set (receiver_id and group_id can both be NULL)
    (conversation_id IS NOT NULL)
);

