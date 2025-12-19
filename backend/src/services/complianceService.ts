import { query } from '../config/database';
import { ComplianceMaster } from '../../shared/src/types';
import { canEditCompliance, checkOrganizationAccess } from '../middleware/adminMiddleware';

export interface ComplianceFilters {
  category?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  scope?: 'GLOBAL' | 'ORG';
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateComplianceData {
  title: string;
  category: string;
  actName?: string;
  description?: string;
  complianceType: 'ONE_TIME' | 'RECURRING';
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';
  effectiveDate?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  version?: string;
}

/**
 * Get compliances for a user based on their role and organization
 * - Super Admin: sees all GLOBAL + all ORG compliances
 * - Admin: sees all GLOBAL + own ORG compliances
 */
export async function getComplianceForUser(
  userId: string,
  userRole: string,
  userOrganizationId: string | null | undefined,
  filters: ComplianceFilters = {}
) {
  const {
    category,
    status,
    scope,
    search,
    page = 1,
    limit = 20,
  } = filters;

  let whereConditions: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  // Scope-based filtering
  if (userRole === 'super_admin') {
    // Super Admin sees everything - no scope filter needed
  } else if (userRole === 'admin') {
    // Admin sees GLOBAL + own ORG compliances
    whereConditions.push(
      `(scope = 'GLOBAL' OR (scope = 'ORG' AND organization_id = $${paramIndex}))`
    );
    queryParams.push(userOrganizationId);
    paramIndex++;
  } else {
    // Employee sees GLOBAL + own ORG compliances (read-only)
    whereConditions.push(
      `(scope = 'GLOBAL' OR (scope = 'ORG' AND organization_id = $${paramIndex}))`
    );
    queryParams.push(userOrganizationId);
    paramIndex++;
  }

  if (category) {
    whereConditions.push(`category = $${paramIndex++}`);
    queryParams.push(category);
  }

  if (status) {
    whereConditions.push(`status = $${paramIndex++}`);
    queryParams.push(status);
  }

  if (scope) {
    whereConditions.push(`scope = $${paramIndex++}`);
    queryParams.push(scope);
  }

  if (search) {
    whereConditions.push(
      `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR act_name ILIKE $${paramIndex})`
    );
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM compliance_master ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get compliances
  const result = await query(
    `SELECT 
      id, title, category, act_name, description, compliance_type, frequency,
      effective_date, status, scope, organization_id, version,
      created_by, created_by_role, created_at, updated_at
    FROM compliance_master 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  return {
    items: result.rows.map(mapComplianceMaster),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get compliance by ID with permission check
 */
export async function getComplianceById(
  id: string,
  userId: string,
  userRole: string,
  userOrganizationId: string | null | undefined
): Promise<ComplianceMaster | null> {
  const result = await query(
    `SELECT 
      id, title, category, act_name, description, compliance_type, frequency,
      effective_date, status, scope, organization_id, version,
      created_by, created_by_role, created_at, updated_at
    FROM compliance_master 
    WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const compliance = mapComplianceMaster(result.rows[0]);

  // Check visibility permission
  const hasAccess = await checkOrganizationAccess(
    userId,
    userRole,
    compliance.organizationId || null
  );

  if (!hasAccess) {
    // If Super Admin, they can access everything
    if (userRole === 'super_admin') {
      return compliance;
    }
    // Otherwise, check if it's GLOBAL or user's org
    if (compliance.scope === 'GLOBAL') {
      return compliance;
    }
    if (compliance.scope === 'ORG' && compliance.organizationId === userOrganizationId) {
      return compliance;
    }
    return null; // No access
  }

  return compliance;
}

/**
 * Create compliance with role-based scope assignment
 */
export async function createCompliance(
  data: CreateComplianceData,
  userId: string,
  userRole: string,
  userOrganizationId: string | null | undefined
): Promise<ComplianceMaster> {
  // Determine scope based on role
  let scope: 'GLOBAL' | 'ORG';
  let organizationId: string | null = null;

  if (userRole === 'super_admin') {
    scope = 'GLOBAL';
    organizationId = null;
  } else if (userRole === 'admin') {
    scope = 'ORG';
    if (!userOrganizationId) {
      throw new Error('Admin must be associated with an organization');
    }
    organizationId = userOrganizationId;
  } else {
    throw new Error('Only Super Admin and Admin can create compliances');
  }

  // Check for duplicate title within same scope
  const duplicateCheck = await query(
    `SELECT id FROM compliance_master 
     WHERE title = $1 AND scope = $2 AND (organization_id = $3 OR (organization_id IS NULL AND $3 IS NULL))`,
    [data.title, scope, organizationId]
  );

  if (duplicateCheck.rows.length > 0) {
    throw new Error(`A compliance with title "${data.title}" already exists in this scope`);
  }

  // Determine created_by_role
  const createdByRole = userRole === 'super_admin' ? 'SUPER_ADMIN' : 'ADMIN';

  const result = await query(
    `INSERT INTO compliance_master 
    (title, category, act_name, description, compliance_type, frequency, 
     effective_date, status, scope, organization_id, version, created_by, created_by_role)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id, title, category, act_name, description, compliance_type, frequency,
      effective_date, status, scope, organization_id, version,
      created_by, created_by_role, created_at, updated_at`,
    [
      data.title,
      data.category,
      data.actName || null,
      data.description || null,
      data.complianceType,
      data.frequency || null,
      data.effectiveDate || null,
      data.status || 'ACTIVE',
      scope,
      organizationId,
      data.version || '1.0',
      userId,
      createdByRole,
    ]
  );

  return mapComplianceMaster(result.rows[0]);
}

/**
 * Update compliance with permission check
 */
export async function updateCompliance(
  id: string,
  data: Partial<CreateComplianceData>,
  userId: string,
  userRole: string,
  userOrganizationId: string | null | undefined
): Promise<ComplianceMaster | null> {
  // First, get the existing compliance
  const existing = await getComplianceById(id, userId, userRole, userOrganizationId);
  if (!existing) {
    return null;
  }

  // Check edit permission
  const canEdit = await canEditCompliance(
    userId,
    userRole,
    existing.scope,
    existing.organizationId || null
  );

  if (!canEdit) {
    throw new Error('You do not have permission to edit this compliance');
  }

  // Prevent scope change
  if (data.status && existing.scope === 'GLOBAL' && userRole === 'admin') {
    throw new Error('Admin cannot modify Global compliances');
  }

  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    // Check for duplicate title within same scope
    const duplicateCheck = await query(
      `SELECT id FROM compliance_master 
       WHERE title = $1 AND scope = $2 AND (organization_id = $3 OR (organization_id IS NULL AND $3 IS NULL)) AND id != $4`,
      [data.title, existing.scope, existing.organizationId, id]
    );
    if (duplicateCheck.rows.length > 0) {
      throw new Error(`A compliance with title "${data.title}" already exists in this scope`);
    }
    updates.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }
  if (data.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(data.category);
  }
  if (data.actName !== undefined) {
    updates.push(`act_name = $${paramIndex++}`);
    values.push(data.actName);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.complianceType !== undefined) {
    updates.push(`compliance_type = $${paramIndex++}`);
    values.push(data.complianceType);
  }
  if (data.frequency !== undefined) {
    updates.push(`frequency = $${paramIndex++}`);
    values.push(data.frequency);
  }
  if (data.effectiveDate !== undefined) {
    updates.push(`effective_date = $${paramIndex++}`);
    values.push(data.effectiveDate || null);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }
  if (data.version !== undefined) {
    updates.push(`version = $${paramIndex++}`);
    values.push(data.version);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await query(
    `UPDATE compliance_master 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, title, category, act_name, description, compliance_type, frequency,
      effective_date, status, scope, organization_id, version,
      created_by, created_by_role, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapComplianceMaster(result.rows[0]);
}

/**
 * Update compliance status (activate/deactivate)
 */
export async function updateComplianceStatus(
  id: string,
  status: 'ACTIVE' | 'INACTIVE',
  userId: string,
  userRole: string,
  userOrganizationId: string | null | undefined
): Promise<ComplianceMaster | null> {
  return updateCompliance(id, { status }, userId, userRole, userOrganizationId);
}

/**
 * Delete compliance
 */
export async function deleteCompliance(
  id: string,
  userId: string,
  userRole: string,
  userOrganizationId: string | null | undefined
): Promise<boolean> {
  // Check permission first
  const existing = await getComplianceById(id, userId, userRole, userOrganizationId);
  if (!existing) {
    return false;
  }

  const canEdit = await canEditCompliance(
    userId,
    userRole,
    existing.scope,
    existing.organizationId || null
  );

  if (!canEdit) {
    throw new Error('You do not have permission to delete this compliance');
  }

  const result = await query(
    `DELETE FROM compliance_master WHERE id = $1`,
    [id]
  );

  return result.rowCount > 0;
}

/**
 * Get compliance categories
 */
export async function getComplianceCategories(): Promise<string[]> {
  const result = await query(
    `SELECT DISTINCT category FROM compliance_master ORDER BY category`,
    []
  );

  return result.rows.map(row => row.category);
}

/**
 * Check if user can edit compliance
 */
export async function canUserEditCompliance(
  complianceId: string,
  userId: string,
  userRole: string,
  userOrganizationId: string | null | undefined
): Promise<boolean> {
  const compliance = await getComplianceById(id, userId, userRole, userOrganizationId);
  if (!compliance) {
    return false;
  }

  return canEditCompliance(
    userId,
    userRole,
    compliance.scope,
    compliance.organizationId || null
  );
}

/**
 * Map database row to ComplianceMaster
 */
function mapComplianceMaster(row: any): ComplianceMaster {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    actName: row.act_name,
    description: row.description,
    complianceType: row.compliance_type,
    frequency: row.frequency,
    effectiveDate: row.effective_date ? row.effective_date.toISOString().split('T')[0] : undefined,
    status: row.status,
    scope: row.scope,
    organizationId: row.organization_id,
    version: row.version,
    createdBy: row.created_by,
    createdByRole: row.created_by_role,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
