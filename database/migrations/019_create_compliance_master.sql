-- Create compliance_master table with role-based scopes
-- This replaces the old compliance_items table structure

-- First, create ENUM types if they don't exist
DO $$ BEGIN
    CREATE TYPE compliance_type_enum AS ENUM ('ONE_TIME', 'RECURRING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE compliance_frequency_enum AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE compliance_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE compliance_scope_enum AS ENUM ('GLOBAL', 'ORG');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE compliance_creator_role_enum AS ENUM ('SUPER_ADMIN', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create compliance_master table
CREATE TABLE IF NOT EXISTS compliance_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    act_name VARCHAR(255),
    description TEXT,
    compliance_type compliance_type_enum NOT NULL DEFAULT 'ONE_TIME',
    frequency compliance_frequency_enum,
    effective_date DATE,
    status compliance_status_enum NOT NULL DEFAULT 'ACTIVE',
    scope compliance_scope_enum NOT NULL DEFAULT 'GLOBAL',
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    created_by UUID NOT NULL REFERENCES users(id),
    created_by_role compliance_creator_role_enum NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure organization_id is NULL for GLOBAL scope
    CONSTRAINT check_global_scope CHECK (
        (scope = 'GLOBAL' AND organization_id IS NULL) OR
        (scope = 'ORG' AND organization_id IS NOT NULL)
    ),
    -- Ensure duplicate titles within same scope
    CONSTRAINT unique_title_per_scope UNIQUE (title, scope, organization_id)
);

-- Create indexes for performance
CREATE INDEX idx_compliance_master_scope ON compliance_master(scope);
CREATE INDEX idx_compliance_master_organization_id ON compliance_master(organization_id);
CREATE INDEX idx_compliance_master_status ON compliance_master(status);
CREATE INDEX idx_compliance_master_category ON compliance_master(category);
CREATE INDEX idx_compliance_master_created_by ON compliance_master(created_by);
CREATE INDEX idx_compliance_master_created_by_role ON compliance_master(created_by_role);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_compliance_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compliance_master_updated_at
    BEFORE UPDATE ON compliance_master
    FOR EACH ROW
    EXECUTE FUNCTION update_compliance_master_updated_at();

