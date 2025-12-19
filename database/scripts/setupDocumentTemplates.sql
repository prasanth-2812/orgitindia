-- Create document_templates table (if not exists)
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'inactive', 'draft')),
    body_template TEXT NOT NULL,
    pdf_settings JSONB DEFAULT '{}',
    version INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add enhanced columns (if not exists)
ALTER TABLE document_templates
ADD COLUMN IF NOT EXISTS header_template TEXT,
ADD COLUMN IF NOT EXISTS template_schema JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS auto_fill_fields JSONB DEFAULT '{}';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(type);
CREATE INDEX IF NOT EXISTS idx_document_templates_status ON document_templates(status);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);

-- Create document_template_versions table (if not exists)
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

