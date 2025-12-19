-- Create compliance_documents table for file attachments

CREATE TABLE IF NOT EXISTS compliance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_id UUID NOT NULL REFERENCES compliance_master(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('PDF', 'DOC', 'DOCX')),
    file_name VARCHAR(255),
    file_size BIGINT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes
CREATE INDEX idx_compliance_documents_compliance_id ON compliance_documents(compliance_id);
CREATE INDEX idx_compliance_documents_uploaded_at ON compliance_documents(uploaded_at);
CREATE INDEX idx_compliance_documents_is_deleted ON compliance_documents(is_deleted) WHERE is_deleted = FALSE;

