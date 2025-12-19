-- Add foreign key constraint for task_id in groups table
-- This migration runs after tasks table is created
ALTER TABLE groups
ADD CONSTRAINT fk_groups_task_id
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

