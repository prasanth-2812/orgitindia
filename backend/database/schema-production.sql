-- ============================================
-- ORGIT Backend - Production Database Schema
-- Complete unified schema for production deployment
-- PostgreSQL 12+ required
-- ============================================
-- 
-- Usage:
--   psql -U postgres -d orgit_production -f schema-production.sql
-- 
-- WARNING: This script will create all tables from scratch.
-- For existing databases, use migration scripts instead.
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- CORE TABLES
-- ============================================

-- Organizations
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

CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'employee' 
        CHECK (role IN ('super_admin', 'admin', 'employee')),
    status VARCHAR(50) NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'suspended')),
    profile_photo_url TEXT,
    profile_photo TEXT,
    bio TEXT,
    password_hash TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_mobile_status ON users(mobile, status);

-- Profiles (Extended user profile data)
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    about TEXT,
    contact_number TEXT,
    profile_photo TEXT,
    company TEXT,
    designation TEXT,
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_contact_number ON profiles(contact_number);

-- User Organizations (Many-to-Many)
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

CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_reporting_to ON user_organizations(reporting_to);

-- Sessions
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

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);

-- OTP Verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_verifications_mobile ON otp_verifications(mobile);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON otp_verifications(expires_at);

-- Contacts
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

CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_mobile ON contacts(mobile);
CREATE INDEX IF NOT EXISTS idx_contacts_registered_user_id ON contacts(registered_user_id);

-- User Contacts (Synced Contacts)
CREATE TABLE IF NOT EXISTS user_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, contact_phone)
);

-- ============================================
-- MESSAGING MODULE
-- ============================================

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    is_group BOOLEAN DEFAULT FALSE,
    group_photo TEXT,
    is_task_group BOOLEAN DEFAULT FALSE,
    task_id UUID,
    created_by UUID REFERENCES users(id),
    type VARCHAR(50) NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_conversations_task_id ON conversations(task_id);

-- Conversation Members
CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id TEXT NOT NULL, -- Supports both UUID and 'direct_<userId>' formats
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    is_pinned BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conv ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_pinned ON conversation_members(user_id, is_pinned) WHERE is_pinned = TRUE;

-- Groups (Legacy support)
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

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_is_task_group ON groups(is_task_group);
CREATE INDEX IF NOT EXISTS idx_groups_task_id ON groups(task_id);

-- Group Members (Legacy support)
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

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_org_id ON group_members(organization_id);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id TEXT,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text'
        CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'voice_note', 'voice')),
    content TEXT,
    media_url TEXT,
    media_thumbnail TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    duration INTEGER,
    reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_for_all BOOLEAN DEFAULT FALSE,
    deleted_for_everyone BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    is_starred BOOLEAN DEFAULT false,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,
    is_live_location BOOLEAN DEFAULT FALSE,
    live_location_expires_at TIMESTAMP,
    visibility_mode VARCHAR(50) DEFAULT 'shared_to_group' 
        CHECK (visibility_mode IN ('org_only', 'shared_to_group')),
    sender_organization_id UUID REFERENCES organizations(id),
    forwarded_from_message_id UUID REFERENCES messages(id),
    mentions JSONB DEFAULT '[]',
    task_mentions JSONB DEFAULT '[]',
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (receiver_id IS NOT NULL AND group_id IS NULL) OR
        (receiver_id IS NULL AND group_id IS NOT NULL) OR
        (conversation_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_visibility_mode ON messages(visibility_mode);
CREATE INDEX IF NOT EXISTS idx_messages_sender_org_id ON messages(sender_organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_starred ON messages(is_starred);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(reply_to_message_id);

-- Message Status
CREATE TABLE IF NOT EXISTS message_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
    status_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_status_message_id ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user_id ON message_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_status_status ON message_status(status);

-- Message Reactions
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- Starred Messages
CREATE TABLE IF NOT EXISTS starred_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_starred_messages_user_id ON starred_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_starred_messages_message_id ON starred_messages(message_id);

-- Message Search (Full-text search)
CREATE TABLE IF NOT EXISTS message_search (
    message_id UUID PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL,
    content_tsvector tsvector,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_search_conversation_id ON message_search(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_search_tsvector ON message_search USING GIN(content_tsvector);

-- ============================================
-- TASKS MODULE
-- ============================================

-- Compliance Master
CREATE TABLE IF NOT EXISTS compliance_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    act_name VARCHAR(255),
    description TEXT,
    compliance_type VARCHAR(50) NOT NULL 
        CHECK (compliance_type IN ('ONE_TIME', 'RECURRING')),
    frequency VARCHAR(50) 
        CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY')),
    effective_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    version VARCHAR(50),
    scope VARCHAR(50) NOT NULL DEFAULT 'GLOBAL' 
        CHECK (scope IN ('GLOBAL', 'ORG')),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_compliance_master_category ON compliance_master(category);
CREATE INDEX IF NOT EXISTS idx_compliance_master_status ON compliance_master(status);
CREATE INDEX IF NOT EXISTS idx_compliance_master_scope ON compliance_master(scope);
CREATE INDEX IF NOT EXISTS idx_compliance_master_organization_id ON compliance_master(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_master_created_by ON compliance_master(created_by);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL DEFAULT 'one_time'
        CHECK (task_type IN ('one_time', 'recurring')),
    creator_id UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('high', 'medium', 'low')),
    start_date TIMESTAMP,
    target_date TIMESTAMP,
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    recurrence_type TEXT,
    recurrence_interval INTEGER DEFAULT 1,
    next_recurrence_date TIMESTAMP,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    auto_escalate BOOLEAN DEFAULT FALSE,
    escalation_rules JSONB,
    frequency VARCHAR(50),
    specific_weekday INTEGER CHECK (specific_weekday >= 0 AND specific_weekday <= 6),
    category VARCHAR(50) CHECK (category IN ('general', 'document_management', 'compliance_management')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'overdue')),
    escalation_status VARCHAR(50) DEFAULT 'none' 
        CHECK (escalation_status IN ('none', 'escalated', 'resolved')),
    compliance_id UUID REFERENCES compliance_master(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_compliance_id ON tasks(compliance_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id);

-- Task Assignees
CREATE TABLE IF NOT EXISTS task_assignees (
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);

-- Task Assignments (Legacy support)
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assigned_to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by_user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed')),
    rejection_reason TEXT,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, assigned_to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_to ON task_assignments(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON task_assignments(status);

-- Task Activities
CREATE TABLE IF NOT EXISTS task_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_user ON task_activities(user_id);

-- Task Status Logs (Legacy support)
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

CREATE INDEX IF NOT EXISTS idx_task_status_logs_task_id ON task_status_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_status_logs_assignment_id ON task_status_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_task_status_logs_created_at ON task_status_logs(created_at);

-- ============================================
-- DOCUMENTS MODULE
-- ============================================

-- Document Templates
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('active', 'inactive', 'draft')),
    header_template TEXT,
    body_template TEXT NOT NULL,
    template_schema JSONB DEFAULT '{}',
    auto_fill_fields JSONB DEFAULT '{}',
    pdf_settings JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(type);
CREATE INDEX IF NOT EXISTS idx_document_templates_status ON document_templates(status);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);

-- Document Template Versions
CREATE TABLE IF NOT EXISTS document_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    body_template TEXT NOT NULL,
    pdf_settings JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_document_template_versions_template_id ON document_template_versions(template_id);

-- Document Instances
CREATE TABLE IF NOT EXISTS document_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES document_templates(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    title VARCHAR(255) NOT NULL,
    filled_data JSONB DEFAULT '{}',
    pdf_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'final', 'archived')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_instances_template_id ON document_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_document_instances_organization_id ON document_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_instances_status ON document_instances(status);
CREATE INDEX IF NOT EXISTS idx_document_instances_created_by ON document_instances(created_by);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    scope VARCHAR(50) NOT NULL DEFAULT 'GLOBAL' 
        CHECK (scope IN ('GLOBAL', 'ORG')),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_by_role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_scope ON documents(scope);
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);

-- Compliance Documents
CREATE TABLE IF NOT EXISTS compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_id UUID NOT NULL REFERENCES compliance_master(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('PDF', 'DOC', 'DOCX')),
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_compliance_documents_compliance_id ON compliance_documents(compliance_id);
CREATE INDEX IF NOT EXISTS idx_compliance_documents_uploaded_by ON compliance_documents(uploaded_by);

-- ============================================
-- NOTIFICATIONS & SETTINGS
-- ============================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    body TEXT,
    type VARCHAR(50) NOT NULL 
        CHECK (type IN ('task_assigned', 'task_accepted', 'task_rejected', 'task_updated', 
                       'task_overdue', 'task_escalated', 'message_received', 'group_member_added', 
                       'document_shared')),
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON notifications(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_message_id ON notifications(message_id);

-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_by ON platform_settings(updated_by);

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

-- Groups -> Tasks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_groups_task_id'
    ) THEN
        ALTER TABLE groups
        ADD CONSTRAINT fk_groups_task_id
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Function: Update message_search when message is inserted/updated
CREATE OR REPLACE FUNCTION messages_search_update() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO message_search (message_id, conversation_id, content_tsvector, created_at)
  VALUES (NEW.id, NEW.conversation_id, to_tsvector('english', COALESCE(NEW.content, '')), NEW.created_at)
  ON CONFLICT (message_id) 
  DO UPDATE SET 
    conversation_id = NEW.conversation_id,
    content_tsvector = to_tsvector('english', COALESCE(NEW.content, '')),
    created_at = NEW.created_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update message_search
DROP TRIGGER IF EXISTS messages_search_trigger ON messages;
CREATE TRIGGER messages_search_trigger
AFTER INSERT OR UPDATE OF content, conversation_id ON messages
FOR EACH ROW
WHEN (NEW.content IS NOT NULL)
EXECUTE FUNCTION messages_search_update();

-- Function: Ensure conversation_members exist (updated version)
CREATE OR REPLACE FUNCTION ensure_conversation_members()
RETURNS TRIGGER AS $$
DECLARE
    conv_id TEXT;
    smaller_user_id UUID;
    larger_user_id UUID;
    actual_conv_id UUID;
BEGIN
    -- If conversation_id is already set by application (UUID format), respect it
    IF NEW.conversation_id IS NOT NULL AND NOT (NEW.conversation_id LIKE 'direct_%' OR NEW.conversation_id LIKE 'group_%') THEN
        -- Try to cast to UUID
        BEGIN
            actual_conv_id := NEW.conversation_id::UUID;
            
            -- Ensure sender is member (use TEXT for conversation_id to support both formats)
            INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
            VALUES (NEW.conversation_id, NEW.sender_id, 'member', CURRENT_TIMESTAMP)
            ON CONFLICT (conversation_id, user_id) DO NOTHING;
            
            -- If receiver_id exists, ensure receiver is member
            IF NEW.receiver_id IS NOT NULL THEN
                INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
                VALUES (NEW.conversation_id, NEW.receiver_id, 'member', CURRENT_TIMESTAMP)
                ON CONFLICT (conversation_id, user_id) DO NOTHING;
            END IF;
            
            -- Update conversation updated_at
            UPDATE conversations SET updated_at = NOW() WHERE id = actual_conv_id;
            
            RETURN NEW;
        EXCEPTION WHEN OTHERS THEN
            -- If cast fails, continue with normal flow
        END;
    END IF;
    
    -- If conversation_id is not set or is in old format, determine it
    IF NEW.receiver_id IS NOT NULL THEN
        -- Use smaller user ID for consistent conversation_id
        IF NEW.sender_id < NEW.receiver_id THEN
            smaller_user_id := NEW.sender_id;
            larger_user_id := NEW.receiver_id;
        ELSE
            smaller_user_id := NEW.receiver_id;
            larger_user_id := NEW.sender_id;
        END IF;
        
        conv_id := 'direct_' || smaller_user_id::TEXT;
        
        -- Ensure sender is member
        INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
        VALUES (conv_id, NEW.sender_id, 'member', CURRENT_TIMESTAMP)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        
        -- Ensure receiver is member
        INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
        VALUES (conv_id, NEW.receiver_id, 'member', CURRENT_TIMESTAMP)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        
        -- For 'direct_<userId>' format, we don't create conversation record here
        -- The application should handle creating UUID conversations
        -- Just ensure members exist
        
    ELSIF NEW.group_id IS NOT NULL THEN
        conv_id := NEW.group_id::TEXT;
        
        -- Ensure sender is member
        INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
        VALUES (conv_id, NEW.sender_id, 'member', CURRENT_TIMESTAMP)
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
        
        -- Update conversation updated_at (create if doesn't exist)
        INSERT INTO conversations (id, type, is_group, is_task_group, created_at, updated_at)
        VALUES (NEW.group_id, 'group', TRUE, FALSE, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
    ELSE
        RETURN NEW;
    END IF;
    
    -- Set conversation_id on message only if not already set
    IF NEW.conversation_id IS NULL OR NEW.conversation_id LIKE 'direct_%' OR NEW.conversation_id LIKE 'group_%' THEN
        NEW.conversation_id := conv_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-populate conversation_id and members
DROP TRIGGER IF EXISTS messages_conversation_trigger ON messages;
CREATE TRIGGER messages_conversation_trigger
    BEFORE INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION ensure_conversation_members();

-- ============================================
-- END OF PRODUCTION SCHEMA
-- ============================================

