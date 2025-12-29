-- ============================================
-- ORGIT Backend - Development Database Schema
-- Complete unified schema for development/testing
-- Includes test data and relaxed constraints
-- PostgreSQL 12+ required
-- ============================================
-- 
-- Usage:
--   Option 1: Run production schema first, then this file
--     psql -U postgres -d orgit_development -f schema-production.sql
--     psql -U postgres -d orgit_development -f schema-development.sql
--   
--   Option 2: Run both in sequence
--     psql -U postgres -d orgit_development -f schema-production.sql -f schema-development.sql
-- 
-- WARNING: This script assumes production schema is already applied.
-- It only adds test data and development helper functions.
-- ============================================

-- ============================================
-- DEVELOPMENT-SPECIFIC MODIFICATIONS
-- ============================================

-- Allow more flexible data for testing
-- (Production schema already has proper constraints)

-- ============================================
-- TEST DATA (Optional - Comment out if not needed)
-- ============================================

-- Insert test organization
INSERT INTO organizations (id, name, email, mobile, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Test Organization', 'test@orgit.com', '+911234567890', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test users
INSERT INTO users (id, mobile, name, role, status, password_hash, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '+911234567890', 'Super Admin', 'super_admin', 'active', '$2b$10$test_hash_super_admin', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000002', '+911234567891', 'Admin User', 'admin', 'active', '$2b$10$test_hash_admin', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000003', '+911234567892', 'Employee User', 'employee', 'active', '$2b$10$test_hash_employee', NOW(), NOW())
ON CONFLICT (mobile) DO NOTHING;

-- Insert test profiles
INSERT INTO profiles (user_id, about, contact_number, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Super Admin Profile', '+911234567890', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000002', 'Admin Profile', '+911234567891', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000003', 'Employee Profile', '+911234567892', NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Link users to organization
INSERT INTO user_organizations (id, user_id, organization_id, department, designation, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'IT', 'Super Admin', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'IT', 'Admin', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Operations', 'Employee', NOW(), NOW())
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Insert test conversation
INSERT INTO conversations (id, name, is_group, type, created_by, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Test Group', TRUE, 'group', '00000000-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test conversation members
INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin', NOW()),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'member', NOW()),
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'member', NOW())
ON CONFLICT (conversation_id, user_id) DO NOTHING;

-- Insert test compliance master
INSERT INTO compliance_master (id, title, category, compliance_type, status, scope, created_by, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Test Compliance', 'Tax', 'RECURRING', 'ACTIVE', 'GLOBAL', '00000000-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test task
INSERT INTO tasks (id, title, description, task_type, creator_id, created_by, organization_id, status, priority, due_date, created_at, updated_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Test Task', 'This is a test task', 'one_time', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'pending', 'medium', NOW() + INTERVAL '7 days', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test task assignee
INSERT INTO task_assignees (task_id, user_id, assigned_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', NOW())
ON CONFLICT (task_id, user_id) DO NOTHING;

-- ============================================
-- DEVELOPMENT HELPER FUNCTIONS
-- ============================================

-- Function: Clear all test data (useful for resetting dev database)
CREATE OR REPLACE FUNCTION clear_test_data() RETURNS void AS $$
BEGIN
    -- Delete in reverse order of dependencies
    DELETE FROM task_assignees WHERE task_id::text LIKE '00000000-%';
    DELETE FROM tasks WHERE id::text LIKE '00000000-%';
    DELETE FROM compliance_master WHERE id::text LIKE '00000000-%';
    DELETE FROM conversation_members WHERE conversation_id::text LIKE '00000000-%';
    DELETE FROM conversations WHERE id::text LIKE '00000000-%';
    DELETE FROM user_organizations WHERE id::text LIKE '00000000-%';
    DELETE FROM profiles WHERE user_id::text LIKE '00000000-%';
    DELETE FROM users WHERE id::text LIKE '00000000-%';
    DELETE FROM organizations WHERE id::text LIKE '00000000-%';
END;
$$ LANGUAGE plpgsql;

-- Function: Reset database (WARNING: Deletes all data)
CREATE OR REPLACE FUNCTION reset_database() RETURNS void AS $$
BEGIN
    -- This is a dangerous function - only use in development!
    -- Truncate all tables in correct order
    TRUNCATE TABLE 
        task_assignees,
        task_assignments,
        task_activities,
        task_status_logs,
        tasks,
        compliance_documents,
        compliance_master,
        document_instances,
        document_template_versions,
        document_templates,
        documents,
        starred_messages,
        message_reactions,
        message_status,
        message_search,
        messages,
        conversation_members,
        conversations,
        group_members,
        groups,
        user_contacts,
        contacts,
        notifications,
        platform_settings,
        sessions,
        user_organizations,
        profiles,
        users,
        organizations
    RESTART IDENTITY CASCADE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DEVELOPMENT NOTES
-- ============================================
-- 
-- 1. Test data uses predictable UUIDs starting with '00000000-0000-0000-0000-'
-- 2. Use clear_test_data() to remove only test data
-- 3. Use reset_database() to clear ALL data (use with caution!)
-- 4. All production constraints and indexes are preserved
-- 5. For testing, you may want to disable certain triggers temporarily
-- 
-- Example: Disable message search trigger for faster inserts during testing
--   ALTER TABLE messages DISABLE TRIGGER messages_search_trigger;
-- 
-- Example: Re-enable trigger
--   ALTER TABLE messages ENABLE TRIGGER messages_search_trigger;
-- 
-- ============================================
-- END OF DEVELOPMENT SCHEMA
-- ============================================

