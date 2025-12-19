-- Create task_status_logs table
CREATE TABLE IF NOT EXISTS task_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES task_assignments(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id UUID NOT NULL REFERENCES users(id),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_status_logs_task_id ON task_status_logs(task_id);
CREATE INDEX idx_task_status_logs_assignment_id ON task_status_logs(assignment_id);
CREATE INDEX idx_task_status_logs_created_at ON task_status_logs(created_at);

