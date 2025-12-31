-- ORGIT Conversations Database Setup Script
-- Run this script on your new database server
-- This script creates tables and functions needed for smooth conversations between users

-- ============================================
-- Migration 016: Create Conversations Table
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    type VARCHAR(50) CHECK (type IN ('direct', 'group')),
    is_group BOOLEAN DEFAULT false,
    is_task_group BOOLEAN DEFAULT false,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    group_photo TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversations_created_by') THEN
        CREATE INDEX idx_conversations_created_by ON conversations(created_by);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversations_task_id') THEN
        CREATE INDEX idx_conversations_task_id ON conversations(task_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversations_is_group') THEN
        CREATE INDEX idx_conversations_is_group ON conversations(is_group);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversations_is_task_group') THEN
        CREATE INDEX idx_conversations_is_task_group ON conversations(is_task_group);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversations_type') THEN
        CREATE INDEX idx_conversations_type ON conversations(type);
    END IF;
END $$;

-- ============================================
-- Migration 017: Create Conversation Members Table
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_pinned BOOLEAN DEFAULT false,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

-- Create indexes only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversation_members_conversation_id') THEN
        CREATE INDEX idx_conversation_members_conversation_id ON conversation_members(conversation_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversation_members_user_id') THEN
        CREATE INDEX idx_conversation_members_user_id ON conversation_members(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversation_members_role') THEN
        CREATE INDEX idx_conversation_members_role ON conversation_members(role);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_conversation_members_is_pinned') THEN
        CREATE INDEX idx_conversation_members_is_pinned ON conversation_members(is_pinned);
    END IF;
END $$;

-- ============================================
-- Migration 018: Update Messages Table for Conversations
-- ============================================
-- Add conversation_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'conversation_id') THEN
        ALTER TABLE messages ADD COLUMN conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;
    END IF;
    
    -- Create index only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_conversation_id') THEN
        CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
    END IF;
END $$;

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'status') THEN
        ALTER TABLE messages ADD COLUMN status VARCHAR(50) CHECK (status IN ('sent', 'delivered', 'read'));
    END IF;
    
    -- Create index only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_status') THEN
        CREATE INDEX idx_messages_status ON messages(status);
    END IF;
END $$;

-- Add deleted_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'deleted_at') THEN
        ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP;
    END IF;
    
    -- Create index only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_messages_deleted_at') THEN
        CREATE INDEX idx_messages_deleted_at ON messages(deleted_at);
    END IF;
END $$;

-- Add deleted_for_all column if it doesn't exist (also check for deleted_for_everyone)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'deleted_for_all') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'deleted_for_everyone') THEN
            -- Rename deleted_for_everyone to deleted_for_all for consistency
            ALTER TABLE messages RENAME COLUMN deleted_for_everyone TO deleted_for_all;
        ELSE
            ALTER TABLE messages ADD COLUMN deleted_for_all BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;

-- Add media_thumbnail column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'media_thumbnail') THEN
        ALTER TABLE messages ADD COLUMN media_thumbnail TEXT;
    END IF;
END $$;

-- Add duration column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'duration') THEN
        ALTER TABLE messages ADD COLUMN duration INTEGER;
    END IF;
END $$;

-- Add location columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'location_lat') THEN
        ALTER TABLE messages ADD COLUMN location_lat DOUBLE PRECISION;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'location_lng') THEN
        ALTER TABLE messages ADD COLUMN location_lng DOUBLE PRECISION;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'location_address') THEN
        ALTER TABLE messages ADD COLUMN location_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'is_live_location') THEN
        ALTER TABLE messages ADD COLUMN is_live_location BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'messages' AND column_name = 'live_location_expires_at') THEN
        ALTER TABLE messages ADD COLUMN live_location_expires_at TIMESTAMP;
    END IF;
END $$;

-- ============================================
-- Migration 019: Update Messages Table Check Constraint
-- ============================================
-- Modify the check constraint to allow conversation_id
-- Drop the old constraint if it exists
DO $$ 
DECLARE
    constraint_rec RECORD;
BEGIN
    -- Find and drop the existing check constraint
    FOR constraint_rec IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'messages'::regclass 
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%receiver_id%group_id%'
    LOOP
        EXECUTE 'ALTER TABLE messages DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_rec.conname);
    END LOOP;
END $$;

-- Add new check constraint that allows conversation_id (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'messages'::regclass 
        AND conname = 'check_message_target'
    ) THEN
        ALTER TABLE messages 
        ADD CONSTRAINT check_message_target 
        CHECK (
            (receiver_id IS NOT NULL AND group_id IS NULL AND conversation_id IS NULL) OR
            (receiver_id IS NULL AND group_id IS NOT NULL AND conversation_id IS NULL) OR
            (receiver_id IS NULL AND group_id IS NULL AND conversation_id IS NOT NULL)
        );
    END IF;
END $$;

-- ============================================
-- Migration 020: Create Function to Get or Create Direct Conversation
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(
    p_user_id_1 UUID,
    p_user_id_2 UUID
)
RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Check if conversation already exists
    SELECT c.id INTO v_conversation_id
    FROM conversations c
    INNER JOIN conversation_members cm1 ON c.id = cm1.conversation_id
    INNER JOIN conversation_members cm2 ON c.id = cm2.conversation_id
    WHERE cm1.user_id = p_user_id_1 
      AND cm2.user_id = p_user_id_2
      AND COALESCE(c.is_group, false) = false
      AND COALESCE(c.is_task_group, false) = false
    LIMIT 1;
    
    -- If conversation exists, return it
    IF v_conversation_id IS NOT NULL THEN
        RETURN v_conversation_id;
    END IF;
    
    -- Create new conversation
    INSERT INTO conversations (id, type, is_group, is_task_group, created_by)
    VALUES (gen_random_uuid(), 'direct', false, false, p_user_id_1)
    RETURNING id INTO v_conversation_id;
    
    -- Add both users as members
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, p_user_id_1, 'member'),
           (v_conversation_id, p_user_id_2, 'member')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
    
    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Migration 021: Create Function to Get Conversation Unread Count
-- ============================================
CREATE OR REPLACE FUNCTION get_conversation_unread_count(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_unread_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_unread_count
    FROM messages m
    WHERE m.conversation_id = p_conversation_id
      AND m.sender_id != p_user_id
      AND (m.status IS NULL OR m.status != 'read')
      AND m.is_deleted = false
      AND m.deleted_at IS NULL;
    
    RETURN COALESCE(v_unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Migration 022: Create Function to Mark Messages as Read
-- ============================================
CREATE OR REPLACE FUNCTION mark_conversation_messages_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE messages
    SET status = 'read', updated_at = CURRENT_TIMESTAMP
    WHERE conversation_id = p_conversation_id
      AND sender_id != p_user_id
      AND (status IS NULL OR status != 'read')
      AND is_deleted = false
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Migration 023: Create Trigger to Update Conversation Updated At
-- ============================================
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.conversation_id IS NOT NULL THEN
        UPDATE conversations
        SET updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_update_conversation_updated_at ON messages;
CREATE TRIGGER trigger_update_conversation_updated_at
    AFTER INSERT OR UPDATE ON messages
    FOR EACH ROW
    WHEN (NEW.conversation_id IS NOT NULL)
    EXECUTE FUNCTION update_conversation_updated_at();

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify tables and columns were created:

-- Check conversations table
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
ORDER BY ordinal_position;

-- Check conversation_members table
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversation_members' 
ORDER BY ordinal_position;

-- Check messages table for new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name IN ('conversation_id', 'status', 'deleted_at', 'deleted_for_all', 
                      'media_thumbnail', 'duration', 'location_lat', 'location_lng', 
                      'location_address', 'is_live_location', 'live_location_expires_at')
ORDER BY column_name;

-- Check functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_or_create_direct_conversation', 
                       'get_conversation_unread_count', 
                       'mark_conversation_messages_as_read',
                       'update_conversation_updated_at')
ORDER BY routine_name;

