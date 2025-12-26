-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'one_time', -- 'one_time', 'recurring'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date TIMESTAMP,
  target_date TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  recurrence_type TEXT, -- 'weekly', 'monthly', 'quarterly', 'yearly' (for recurring tasks)
  recurrence_interval INTEGER DEFAULT 1, -- e.g., every 2 weeks, every 3 months
  next_recurrence_date TIMESTAMP, -- When to create next instance
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- For recurring task instances
  auto_escalate BOOLEAN DEFAULT FALSE,
  escalation_rules JSONB, -- Store escalation configuration
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Task Assignees Table
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,
  PRIMARY KEY (task_id, user_id)
);

-- Task Activity Log Table (for tracking status changes, etc.)
CREATE TABLE IF NOT EXISTS task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL, -- 'created', 'accepted', 'rejected', 'status_changed', 'completed', 'assigned'
  old_value TEXT,
  new_value TEXT,
  message TEXT, -- Optional message/description
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_task ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);

