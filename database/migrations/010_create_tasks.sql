-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL CHECK (task_type IN ('one_time', 'recurring')),
    creator_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    start_date DATE,
    target_date DATE,
    due_date DATE,
    frequency VARCHAR(50), -- For recurring tasks: 'weekly', 'monthly', 'quarterly', 'yearly', 'specific_weekday'
    specific_weekday INTEGER CHECK (specific_weekday >= 0 AND specific_weekday <= 6), -- 0=Sunday, 6=Saturday
    next_recurrence_date DATE, -- For recurring tasks
    category VARCHAR(50) CHECK (category IN ('general', 'document_management', 'compliance_management')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'overdue')),
    escalation_status VARCHAR(50) DEFAULT 'none' CHECK (escalation_status IN ('none', 'escalated', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX idx_tasks_org_id ON tasks(organization_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_task_type ON tasks(task_type);
CREATE INDEX idx_tasks_category ON tasks(category);

