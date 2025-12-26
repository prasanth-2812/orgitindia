-- ============================================
-- Enhanced Message Module Database Schema
-- Adds message_search, starred_messages, and enhances existing tables
-- ============================================

-- Enable pg_trgm extension for better text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- Enhance messages table with additional fields
-- ============================================
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS media_thumbnail TEXT,
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS is_live_location BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS live_location_expires_at TIMESTAMP;

-- Create index on conversation_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- ============================================
-- Table: Starred Messages
-- ============================================
CREATE TABLE IF NOT EXISTS starred_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_starred_messages_user_id ON starred_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_starred_messages_message_id ON starred_messages(message_id);

-- ============================================
-- Table: Message Search (Full-text search index)
-- ============================================
CREATE TABLE IF NOT EXISTS message_search (
    message_id UUID PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
    conversation_id VARCHAR(255) NOT NULL,
    content_tsvector tsvector,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_search_conversation_id ON message_search(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_search_tsvector ON message_search USING GIN(content_tsvector);

-- ============================================
-- Function: Update message_search when message is inserted/updated
-- ============================================
CREATE OR REPLACE FUNCTION update_message_search()
RETURNS TRIGGER AS $$
BEGIN
    -- Determine conversation_id
    DECLARE
        conv_id VARCHAR(255);
    BEGIN
        IF NEW.receiver_id IS NOT NULL THEN
            conv_id := 'direct_' || NEW.receiver_id;
        ELSIF NEW.group_id IS NOT NULL THEN
            conv_id := 'group_' || NEW.group_id;
        ELSE
            conv_id := NULL;
        END IF;
        
        -- Insert or update message_search
        INSERT INTO message_search (message_id, conversation_id, content_tsvector, created_at)
        VALUES (
            NEW.id,
            conv_id,
            to_tsvector('english', COALESCE(NEW.content, '')),
            NEW.created_at
        )
        ON CONFLICT (message_id) 
        DO UPDATE SET
            conversation_id = EXCLUDED.conversation_id,
            content_tsvector = to_tsvector('english', COALESCE(NEW.content, '')),
            created_at = NEW.created_at;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Automatically update message_search
-- ============================================
DROP TRIGGER IF EXISTS messages_search_trigger ON messages;
CREATE TRIGGER messages_search_trigger
    AFTER INSERT OR UPDATE OF content ON messages
    FOR EACH ROW
    WHEN (NEW.content IS NOT NULL AND NEW.is_deleted = false)
    EXECUTE FUNCTION update_message_search();

-- ============================================
-- Enhance notifications table for messages
-- ============================================
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS body TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON notifications(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_message_id ON notifications(message_id);

-- Update notifications type to include 'message' (if not already in CHECK constraint)
-- Note: PostgreSQL doesn't support ALTER CHECK constraint easily, so we'll handle this in application code
-- The existing constraint should already include 'message_received' which is close enough

-- ============================================
-- Table: Conversation Members (for membership checks)
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_conversation_id ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);

-- ============================================
-- Table: Conversations (metadata)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(255) PRIMARY KEY, -- Format: 'direct_<userId>' or 'group_<groupId>'
    type VARCHAR(50) NOT NULL CHECK (type IN ('direct', 'group')),
    name VARCHAR(255),
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

-- ============================================
-- Function: Auto-create conversation_members for direct messages
-- ============================================
CREATE OR REPLACE FUNCTION ensure_conversation_members()
RETURNS TRIGGER AS $$
DECLARE
    conv_id VARCHAR(255);
BEGIN
    -- Determine conversation_id
    IF NEW.receiver_id IS NOT NULL THEN
        conv_id := 'direct_' || NEW.receiver_id;
        
        -- Ensure sender is member
        INSERT INTO conversation_members (conversation_id, user_id)
        VALUES (conv_id, NEW.sender_id)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        
        -- Ensure receiver is member
        INSERT INTO conversation_members (conversation_id, user_id)
        VALUES (conv_id, NEW.receiver_id)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        
        -- Update conversation updated_at
        INSERT INTO conversations (id, type, updated_at)
        VALUES (conv_id, 'direct', NOW())
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
        
    ELSIF NEW.group_id IS NOT NULL THEN
        conv_id := 'group_' || NEW.group_id;
        
        -- Ensure sender is member (should already be in group_members, but ensure in conversation_members too)
        INSERT INTO conversation_members (conversation_id, user_id)
        VALUES (conv_id, NEW.sender_id)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        
        -- Update conversation updated_at
        INSERT INTO conversations (id, type, updated_at)
        VALUES (conv_id, 'group', NOW())
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
    END IF;
    
    -- Set conversation_id on message
    NEW.conversation_id := conv_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Auto-populate conversation_id and members
-- ============================================
DROP TRIGGER IF EXISTS messages_conversation_trigger ON messages;
CREATE TRIGGER messages_conversation_trigger
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION ensure_conversation_members();

-- ============================================
-- Populate existing messages with conversation_id
-- ============================================
UPDATE messages 
SET conversation_id = CASE 
    WHEN receiver_id IS NOT NULL THEN 'direct_' || receiver_id
    WHEN group_id IS NOT NULL THEN 'group_' || group_id
    ELSE NULL
END
WHERE conversation_id IS NULL;

-- ============================================
-- Populate conversation_members from existing messages
-- ============================================
INSERT INTO conversation_members (conversation_id, user_id)
SELECT DISTINCT 
    CASE 
        WHEN receiver_id IS NOT NULL THEN 'direct_' || receiver_id
        WHEN group_id IS NOT NULL THEN 'group_' || group_id
    END as conversation_id,
    sender_id as user_id
FROM messages
WHERE conversation_id IS NOT NULL
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO conversation_members (conversation_id, user_id)
SELECT DISTINCT 
    'direct_' || receiver_id as conversation_id,
    receiver_id as user_id
FROM messages
WHERE receiver_id IS NOT NULL
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- ============================================
-- Populate message_search for existing messages
-- ============================================
INSERT INTO message_search (message_id, conversation_id, content_tsvector, created_at)
SELECT 
    id,
    CASE 
        WHEN receiver_id IS NOT NULL THEN 'direct_' || receiver_id
        WHEN group_id IS NOT NULL THEN 'group_' || group_id
    END as conversation_id,
    to_tsvector('english', COALESCE(content, '')),
    created_at
FROM messages
WHERE content IS NOT NULL AND is_deleted = false
ON CONFLICT (message_id) DO NOTHING;

