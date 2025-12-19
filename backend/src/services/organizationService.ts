import { query } from '../config/database';
import pool from '../config/database';
import { Organization } from '../../shared/src/types';

export interface OrganizationFilters {
  status?: 'active' | 'inactive' | 'suspended';
  search?: string;
  page?: number;
  limit?: number;
}

export interface OrganizationStats {
  totalUsers: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

/**
 * Get all organizations with filters and pagination
 */
export async function getAllOrganizations(filters: OrganizationFilters = {}) {
  const {
    status,
    search,
    page = 1,
    limit = 20,
  } = filters;

  let whereConditions: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (status) {
    whereConditions.push(`status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  if (search) {
    whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR mobile ILIKE $${paramIndex})`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM organizations ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get organizations
  const result = await query(
    `SELECT 
      id, name, logo_url, address, email, mobile, gst, pan, cin, 
      accounting_year_start, created_at, updated_at,
      CASE 
        WHEN EXISTS (SELECT 1 FROM user_organizations WHERE organization_id = organizations.id) THEN 'active'
        ELSE 'inactive'
      END as status
    FROM organizations 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  return {
    organizations: result.rows.map(mapOrganization),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(id: string): Promise<Organization | null> {
  const result = await query(
    `SELECT 
      id, name, logo_url, address, email, mobile, gst, pan, cin, 
      accounting_year_start, created_at, updated_at
    FROM organizations 
    WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapOrganization(result.rows[0]);
}

/**
 * Create a new organization
 */
export async function createOrganization(data: {
  name: string;
  logoUrl?: string;
  address?: string;
  email?: string;
  mobile?: string;
  gst?: string;
  pan?: string;
  cin?: string;
  accountingYearStart?: string;
}): Promise<Organization> {
  const result = await query(
    `INSERT INTO organizations 
    (name, logo_url, address, email, mobile, gst, pan, cin, accounting_year_start)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, name, logo_url, address, email, mobile, gst, pan, cin, 
      accounting_year_start, created_at, updated_at`,
    [
      data.name,
      data.logoUrl || null,
      data.address || null,
      data.email || null,
      data.mobile || null,
      data.gst || null,
      data.pan || null,
      data.cin || null,
      data.accountingYearStart || null,
    ]
  );

  return mapOrganization(result.rows[0]);
}

/**
 * Update organization
 */
export async function updateOrganization(
  id: string,
  data: Partial<{
    name: string;
    logoUrl: string;
    address: string;
    email: string;
    mobile: string;
    gst: string;
    pan: string;
    cin: string;
    accountingYearStart: string;
  }>
): Promise<Organization | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.logoUrl !== undefined) {
    updates.push(`logo_url = $${paramIndex++}`);
    values.push(data.logoUrl);
  }
  if (data.address !== undefined) {
    updates.push(`address = $${paramIndex++}`);
    values.push(data.address);
  }
  if (data.email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    values.push(data.email);
  }
  if (data.mobile !== undefined) {
    updates.push(`mobile = $${paramIndex++}`);
    values.push(data.mobile);
  }
  if (data.gst !== undefined) {
    updates.push(`gst = $${paramIndex++}`);
    values.push(data.gst);
  }
  if (data.pan !== undefined) {
    updates.push(`pan = $${paramIndex++}`);
    values.push(data.pan);
  }
  if (data.cin !== undefined) {
    updates.push(`cin = $${paramIndex++}`);
    values.push(data.cin);
  }
  if (data.accountingYearStart !== undefined) {
    updates.push(`accounting_year_start = $${paramIndex++}`);
    values.push(data.accountingYearStart);
  }

  if (updates.length === 0) {
    return getOrganizationById(id);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await query(
    `UPDATE organizations 
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, logo_url, address, email, mobile, gst, pan, cin, 
      accounting_year_start, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapOrganization(result.rows[0]);
}

/**
 * Suspend organization (mark all users as inactive)
 */
export async function suspendOrganization(id: string): Promise<boolean> {
  // Update all users in this organization to inactive
  await query(
    `UPDATE users 
    SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
    WHERE id IN (
      SELECT user_id FROM user_organizations WHERE organization_id = $1
    )`,
    [id]
  );

  return true;
}

/**
 * Activate organization (mark all users as active)
 */
export async function activateOrganization(id: string): Promise<boolean> {
  // Update all users in this organization to active
  await query(
    `UPDATE users 
    SET status = 'active', updated_at = CURRENT_TIMESTAMP
    WHERE id IN (
      SELECT user_id FROM user_organizations WHERE organization_id = $1
    )`,
    [id]
  );

  return true;
}

/**
 * Get organization users
 */
export async function getOrganizationUsers(organizationId: string) {
  const result = await query(
    `SELECT 
      u.id, u.mobile, u.name, u.role, u.status, u.profile_photo_url, u.bio,
      u.created_at, u.updated_at,
      uo.department, uo.designation, uo.reporting_to
    FROM users u
    INNER JOIN user_organizations uo ON u.id = uo.user_id
    WHERE uo.organization_id = $1
    ORDER BY u.created_at DESC`,
    [organizationId]
  );

  return result.rows.map(row => ({
    id: row.id,
    mobile: row.mobile,
    name: row.name,
    role: row.role,
    status: row.status,
    profilePhotoUrl: row.profile_photo_url,
    bio: row.bio,
    department: row.department,
    designation: row.designation,
    reportingTo: row.reporting_to,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

/**
 * Get organization tasks
 */
export async function getOrganizationTasks(organizationId: string, filters: {
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { status, page = 1, limit = 20 } = filters;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE t.organization_id = $1';
  const params: any[] = [organizationId];

  if (status) {
    whereClause += ' AND t.status = $2';
    params.push(status);
  }

  const countResult = await query(
    `SELECT COUNT(*) as total FROM tasks t ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  const result = await query(
    `SELECT 
      t.id, t.title, t.description, t.task_type, t.creator_id, t.organization_id,
      t.start_date, t.target_date, t.due_date, t.frequency, t.specific_weekday,
      t.next_recurrence_date, t.category, t.status, t.escalation_status,
      t.created_at, t.updated_at
    FROM tasks t
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    tasks: result.rows.map(mapTask),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Delete organization and all related data
 */
export async function deleteOrganization(id: string): Promise<boolean> {
  // Use transaction to ensure all related data is deleted
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete user_organizations relationships
    await client.query(
      'DELETE FROM user_organizations WHERE organization_id = $1',
      [id]
    );
    
    // Delete tasks (or mark as deleted if soft delete is preferred)
    await client.query(
      'DELETE FROM tasks WHERE organization_id = $1',
      [id]
    );
    
    // Delete groups associated with this organization
    await client.query(
      'DELETE FROM groups WHERE organization_id = $1',
      [id]
    );
    
    // Finally delete the organization
    await client.query(
      'DELETE FROM organizations WHERE id = $1',
      [id]
    );
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get organization statistics
 */
export async function getOrganizationStats(organizationId: string): Promise<OrganizationStats> {
  const usersResult = await query(
    `SELECT COUNT(*) as total FROM user_organizations WHERE organization_id = $1`,
    [organizationId]
  );
  const totalUsers = parseInt(usersResult.rows[0].total, 10);

  const tasksResult = await query(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'in_progress') as active,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'overdue') as overdue
    FROM tasks
    WHERE organization_id = $1`,
    [organizationId]
  );

  const row = tasksResult.rows[0];
  return {
    totalUsers,
    totalTasks: parseInt(row.total, 10),
    activeTasks: parseInt(row.active, 10),
    completedTasks: parseInt(row.completed, 10),
    overdueTasks: parseInt(row.overdue, 10),
  };
}

/**
 * Map database row to Organization type
 */
function mapOrganization(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    address: row.address,
    email: row.email,
    mobile: row.mobile,
    gst: row.gst,
    pan: row.pan,
    cin: row.cin,
    accountingYearStart: row.accounting_year_start
      ? row.accounting_year_start.toISOString().split('T')[0]
      : undefined,
  };
}

/**
 * Map database row to Task type
 */
function mapTask(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    taskType: row.task_type,
    creatorId: row.creator_id,
    organizationId: row.organization_id,
    startDate: row.start_date ? row.start_date.toISOString() : undefined,
    targetDate: row.target_date ? row.target_date.toISOString() : undefined,
    dueDate: row.due_date ? row.due_date.toISOString() : undefined,
    frequency: row.frequency,
    specificWeekday: row.specific_weekday,
    nextRecurrenceDate: row.next_recurrence_date
      ? row.next_recurrence_date.toISOString()
      : undefined,
    category: row.category,
    status: row.status,
    escalationStatus: row.escalation_status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

