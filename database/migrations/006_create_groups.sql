-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    photo_url TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    is_task_group BOOLEAN DEFAULT false,
    task_id UUID, -- Will reference tasks table (created later)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_is_task_group ON groups(is_task_group);
CREATE INDEX idx_groups_task_id ON groups(task_id);

