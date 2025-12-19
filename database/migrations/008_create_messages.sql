-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id), -- For one-to-one messages
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE, -- For group messages
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'voice_note')),
    content TEXT,
    media_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    visibility_mode VARCHAR(50) DEFAULT 'shared_to_group' CHECK (visibility_mode IN ('org_only', 'shared_to_group')),
    sender_organization_id UUID NOT NULL REFERENCES organizations(id),
    reply_to_message_id UUID REFERENCES messages(id),
    forwarded_from_message_id UUID REFERENCES messages(id),
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    deleted_for_everyone BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    is_starred BOOLEAN DEFAULT false,
    mentions JSONB DEFAULT '[]', -- Array of mentioned user IDs
    task_mentions JSONB DEFAULT '[]', -- Array of mentioned task IDs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (receiver_id IS NOT NULL AND group_id IS NULL) OR
        (receiver_id IS NULL AND group_id IS NOT NULL)
    )
);

CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_visibility_mode ON messages(visibility_mode);
CREATE INDEX idx_messages_sender_org_id ON messages(sender_organization_id);

