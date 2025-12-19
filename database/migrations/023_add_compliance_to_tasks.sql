-- Add compliance_id column to tasks table for Task-Compliance linking
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS compliance_id UUID REFERENCES compliance_master(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_compliance_id ON tasks(compliance_id);

