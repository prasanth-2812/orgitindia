-- Migrate data from compliance_items to compliance_master
-- This migration preserves existing data and sets appropriate defaults

-- Migrate existing compliance_items to compliance_master
INSERT INTO compliance_master (
    id,
    title,
    category,
    act_name,
    description,
    compliance_type,
    frequency,
    effective_date,
    status,
    scope,
    organization_id,
    version,
    created_by,
    created_by_role,
    created_at,
    updated_at
)
SELECT 
    id,
    name as title,
    category,
    NULL as act_name,
    description,
    'ONE_TIME'::compliance_type_enum as compliance_type,
    NULL as frequency,
    NULL as effective_date,
    CASE 
        WHEN status = 'active' THEN 'ACTIVE'::compliance_status_enum
        WHEN status = 'inactive' THEN 'INACTIVE'::compliance_status_enum
        ELSE 'INACTIVE'::compliance_status_enum
    END as status,
    'GLOBAL'::compliance_scope_enum as scope,
    NULL as organization_id,
    '1.0' as version,
    created_by,
    'SUPER_ADMIN'::compliance_creator_role_enum as created_by_role,
    created_at,
    updated_at
FROM compliance_items
WHERE NOT EXISTS (
    SELECT 1 FROM compliance_master WHERE compliance_master.id = compliance_items.id
);

-- After migration, you can optionally drop the old table
-- Uncomment the following line after verifying the migration:
-- DROP TABLE IF EXISTS compliance_items CASCADE;

