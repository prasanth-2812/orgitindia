-- Create enums for documents if they don't exist

DO $$ BEGIN
    CREATE TYPE document_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_scope_enum AS ENUM ('GLOBAL', 'ORG');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_creator_role_enum AS ENUM ('SUPER_ADMIN', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Main documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    file_url TEXT NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    status document_status_enum NOT NULL DEFAULT 'ACTIVE',
    scope document_scope_enum NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_by_role document_creator_role_enum NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure organization_id is NULL for GLOBAL scope and NOT NULL for ORG scope
    CONSTRAINT check_document_scope CHECK (
        (scope = 'GLOBAL' AND organization_id IS NULL) OR
        (scope = 'ORG' AND organization_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_documents_scope ON documents(scope);
CREATE INDEX IF NOT EXISTS idx_documents_org_id ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);

-- Simple versioning table (optional but recommended)
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);


