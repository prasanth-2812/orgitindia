-- Create contacts table (synced contacts)
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

