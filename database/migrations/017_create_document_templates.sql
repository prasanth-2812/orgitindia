-- Create document_templates table
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

CREATE INDEX idx_document_templates_type ON document_templates(type);
CREATE INDEX idx_document_templates_status ON document_templates(status);
CREATE INDEX idx_document_templates_created_by ON document_templates(created_by);

-- Create document_template_versions table for version history
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

CREATE INDEX idx_document_template_versions_template_id ON document_template_versions(template_id);

