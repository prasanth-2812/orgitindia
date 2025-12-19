-- ORGIT Database Setup Script for pgAdmin
-- Run this in pgAdmin Query Tool after creating the 'orgit' database
-- Execute each section in order

-- ============================================
-- Migration 001: Create Organizations Table
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    address TEXT,
    email VARCHAR(255),
    mobile VARCHAR(20),
    gst VARCHAR(50),
    pan VARCHAR(50),
    cin VARCHAR(50),
    accounting_year_start DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_name ON organizations(name);

-- ============================================
-- Migration 002: Create Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    profile_photo_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================
-- Migration 003: Create User Organizations Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department VARCHAR(255),
    designation VARCHAR(255),
    reporting_to UUID REFERENCES users(id),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX idx_user_organizations_reporting_to ON user_organizations(reporting_to);

-- ============================================
-- Migration 004: Create Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) CHECK (device_type IN ('mobile', 'web')),
    token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_device_id ON sessions(device_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);

-- ============================================
-- Migration 005: Create Contacts Table
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    is_registered BOOLEAN DEFAULT false,
    registered_user_id UUID REFERENCES users(id),
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, mobile)
);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_mobile ON contacts(mobile);
CREATE INDEX idx_contacts_registered_user_id ON contacts(registered_user_id);

-- ============================================
-- Migration 006: Create Groups Table
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    photo_url TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    is_task_group BOOLEAN DEFAULT false,
    task_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_is_task_group ON groups(is_task_group);
CREATE INDEX idx_groups_task_id ON groups(task_id);

-- ============================================
-- Migration 007: Create Group Members Table
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_org_id ON group_members(organization_id);

-- ============================================
-- Migration 008: Create Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
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
    mentions JSONB DEFAULT '[]',
    task_mentions JSONB DEFAULT '[]',
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

-- ============================================
-- Migration 009: Create Message Status Table
-- ============================================
CREATE TABLE IF NOT EXISTS message_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
    status_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

CREATE INDEX idx_message_status_message_id ON message_status(message_id);
CREATE INDEX idx_message_status_user_id ON message_status(user_id);
CREATE INDEX idx_message_status_status ON message_status(status);

-- ============================================
-- Migration 010: Create Tasks Table
-- ============================================
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
    frequency VARCHAR(50),
    specific_weekday INTEGER CHECK (specific_weekday >= 0 AND specific_weekday <= 6),
    next_recurrence_date DATE,
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

-- ============================================
-- Migration 011: Create Task Assignments Table
-- ============================================
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assigned_to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by_user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed')),
    rejection_reason TEXT,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, assigned_to_user_id)
);

CREATE INDEX idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_assigned_to ON task_assignments(assigned_to_user_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);

-- ============================================
-- Migration 012: Create Task Status Logs Table
-- ============================================
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

-- ============================================
-- Migration 013: Create Notifications Table
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('task_assigned', 'task_accepted', 'task_rejected', 'task_updated', 'task_overdue', 'task_escalated', 'message_received', 'group_member_added', 'document_shared')),
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(type);

-- ============================================
-- Migration 014: Create OTP Verifications Table
-- ============================================
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_verifications_mobile ON otp_verifications(mobile);
CREATE INDEX idx_otp_verifications_expires_at ON otp_verifications(expires_at);

-- ============================================
-- Migration 015: Add Foreign Key for Task ID in Groups
-- ============================================
ALTER TABLE groups
ADD CONSTRAINT fk_groups_task_id
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify all tables were created:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- You should see 14 tables:
-- contacts
-- group_members
-- groups
-- message_status
-- messages
-- notifications
-- organizations
-- otp_verifications
-- sessions
-- task_assignments
-- task_status_logs
-- tasks
-- user_organizations
-- users

