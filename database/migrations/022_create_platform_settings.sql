-- Create platform_settings table for Super Admin configuration
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_settings_updated_at();

-- Insert default settings
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
('auto_escalation', '{"enabled": true, "unaccepted_hours": 24, "overdue_days": 2, "missed_recurrence_enabled": true}', 'Auto escalation configuration'),
('reminder', '{"due_soon_days": 3, "push_enabled": true, "email_enabled": true, "reminder_intervals": [24, 12, 6]}', 'Reminder configuration'),
('recurring_tasks', '{"default_frequencies": ["weekly", "monthly", "quarterly", "yearly"], "auto_calculate_due_date": true, "escalation_enabled": true}', 'Recurring task settings'),
('system', '{"maintenance_mode": false, "features": {}}', 'System configuration')
ON CONFLICT (setting_key) DO NOTHING;

CREATE INDEX idx_platform_settings_key ON platform_settings(setting_key);

