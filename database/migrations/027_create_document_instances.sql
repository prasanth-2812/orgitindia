-- Create document_instances table to store generated documents from templates

CREATE TABLE IF NOT EXISTS document_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    filled_data JSONB NOT NULL DEFAULT '{}',
    pdf_url TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_instances_template_id ON document_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_document_instances_organization_id ON document_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_instances_created_by ON document_instances(created_by);
CREATE INDEX IF NOT EXISTS idx_document_instances_status ON document_instances(status);
CREATE INDEX IF NOT EXISTS idx_document_instances_created_at ON document_instances(created_at DESC);

-- Create index on filled_data for search functionality
CREATE INDEX IF NOT EXISTS idx_document_instances_filled_data ON document_instances USING GIN (filled_data);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_instances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_instances_updated_at
    BEFORE UPDATE ON document_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_document_instances_updated_at();

-- Add comments for documentation
COMMENT ON TABLE document_instances IS 'Stores document instances created from templates by admins/employees';
COMMENT ON COLUMN document_instances.filled_data IS 'JSON object containing user-filled values for editable template fields';
COMMENT ON COLUMN document_instances.pdf_url IS 'Path to generated PDF file';
COMMENT ON COLUMN document_instances.status IS 'Document status: draft (editable), final (locked), archived (deleted)';

