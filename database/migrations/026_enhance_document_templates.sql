-- Enhance document_templates table with header template, schema, and auto-fill fields

-- Add header_template column (separate from body_template for header section)
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS header_template TEXT;

-- Add template_schema JSONB column to define editable fields structure
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS template_schema JSONB DEFAULT '{}';

-- Add auto_fill_fields JSONB column to map Entity Master Data fields to template placeholders
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS auto_fill_fields JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN document_templates.header_template IS 'HTML template for header section (auto-filled from Entity Master Data, not editable by users)';
COMMENT ON COLUMN document_templates.template_schema IS 'JSON schema defining editable fields, their types, labels, and validation rules';
COMMENT ON COLUMN document_templates.auto_fill_fields IS 'Mapping of Entity Master Data fields to template placeholders (e.g., {"companyName": "{{org.name}}", "gst": "{{org.gst}}"})';

-- Create index on template_schema for faster queries (if needed for filtering)
CREATE INDEX IF NOT EXISTS idx_document_templates_schema ON document_templates USING GIN (template_schema);

