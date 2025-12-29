-- ============================================
-- Fix: Update ensure_conversation_members() trigger function
-- to use consistent conversation_id normalization (smaller user ID)
-- This prevents duplicate conversations when users send messages to each other
-- ============================================

CREATE OR REPLACE FUNCTION ensure_conversation_members()
RETURNS TRIGGER AS $$
DECLARE
    conv_id VARCHAR(255);
    smaller_user_id UUID;
    larger_user_id UUID;
BEGIN
    -- CRITICAL FIX: If conversation_id is already set by application (e.g., UUID format),
    -- respect it and only ensure conversation_members exist
    IF NEW.conversation_id IS NOT NULL AND NOT (NEW.conversation_id LIKE 'direct_%' OR NEW.conversation_id LIKE 'group_%') THEN
        -- conversation_id is already set (likely a UUID) - just ensure members exist
        -- Check if this is a direct conversation by checking receiver_id
        IF NEW.receiver_id IS NOT NULL THEN
            -- Ensure sender is member
            INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
            VALUES (NEW.conversation_id, NEW.sender_id, 'member', CURRENT_TIMESTAMP)
            ON CONFLICT (conversation_id, user_id) DO NOTHING;
            
            -- Ensure receiver is member
            INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
            VALUES (NEW.conversation_id, NEW.receiver_id, 'member', CURRENT_TIMESTAMP)
            ON CONFLICT (conversation_id, user_id) DO NOTHING;
        END IF;
        
        -- Update conversation updated_at if conversation exists
        UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
        
        -- Don't override conversation_id - return as-is
        RETURN NEW;
    END IF;
    
    -- If conversation_id is not set or is in old format, determine it
    IF NEW.receiver_id IS NOT NULL THEN
        -- CRITICAL FIX: Use smaller user ID for consistent conversation_id
        -- This ensures both users use the same conversation_id format
        IF NEW.sender_id < NEW.receiver_id THEN
            smaller_user_id := NEW.sender_id;
            larger_user_id := NEW.receiver_id;
        ELSE
            smaller_user_id := NEW.receiver_id;
            larger_user_id := NEW.sender_id;
        END IF;
        
        conv_id := 'direct_' || smaller_user_id;
        
        -- Ensure sender is member
        INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
        VALUES (conv_id, NEW.sender_id, 'member', CURRENT_TIMESTAMP)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        
        -- Ensure receiver is member
        INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
        VALUES (conv_id, NEW.receiver_id, 'member', CURRENT_TIMESTAMP)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        
        -- Update conversation updated_at
        INSERT INTO conversations (id, type, is_group, is_task_group, created_at, updated_at)
        VALUES (conv_id, 'direct', FALSE, FALSE, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
        
    ELSIF NEW.group_id IS NOT NULL THEN
        conv_id := 'group_' || NEW.group_id;
        
        -- Ensure sender is member (should already be in group_members, but ensure in conversation_members too)
        INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
        VALUES (conv_id, NEW.sender_id, 'member', CURRENT_TIMESTAMP)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        
        -- Update conversation updated_at
        INSERT INTO conversations (id, type, is_group, is_task_group, created_at, updated_at)
        VALUES (conv_id, 'group', TRUE, FALSE, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
    ELSE
        -- No receiver_id or group_id, and no conversation_id set
        RETURN NEW;
    END IF;
    
    -- Set conversation_id on message (use normalized value) only if not already set
    IF NEW.conversation_id IS NULL OR NEW.conversation_id LIKE 'direct_%' OR NEW.conversation_id LIKE 'group_%' THEN
        NEW.conversation_id := conv_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Note: The trigger is already created, this just updates the function
-- ============================================

