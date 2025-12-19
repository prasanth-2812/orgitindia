import { query } from '../config/database';
import pool from '../config/database';

/**
 * Get all users (for super admin)
 */
export async function getAllUsers(filters: {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  const {
    role,
    status,
    search,
    page = 1,
    limit = 20,
  } = filters;

  let whereConditions: string[] = [];
  const queryParams: any[] = [];
  let paramIndex = 1;

  if (role) {
    whereConditions.push(`role = $${paramIndex++}`);
    queryParams.push(role);
  }

  if (status) {
    whereConditions.push(`status = $${paramIndex++}`);
    queryParams.push(status);
  }

  if (search) {
    whereConditions.push(`(name ILIKE $${paramIndex} OR mobile ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  const offset = (page - 1) * limit;

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM users ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get users
  const result = await query(
    `SELECT 
      id, mobile, name, role, status, profile_photo_url, bio,
      created_at, updated_at
    FROM users 
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  return {
    users: result.rows.map(row => ({
      id: row.id,
      mobile: row.mobile,
      name: row.name,
      role: row.role,
      status: row.status,
      profilePhotoUrl: row.profile_photo_url,
      bio: row.bio,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
  const result = await query(
    'SELECT id, mobile, name, role, status, profile_photo_url, bio, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    mobile: row.mobile,
    name: row.name,
    role: row.role,
    status: row.status,
    profilePhotoUrl: row.profile_photo_url,
    bio: row.bio,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Delete user and all related data
 */
export async function deleteUser(id: string): Promise<boolean> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete user_organizations relationships
    await client.query(
      'DELETE FROM user_organizations WHERE user_id = $1',
      [id]
    );
    
    // Delete group memberships
    await client.query(
      'DELETE FROM group_members WHERE user_id = $1',
      [id]
    );
    
    // Delete messages sent by user
    await client.query(
      'DELETE FROM messages WHERE sender_id = $1',
      [id]
    );
    
    // Delete message status records
    await client.query(
      'DELETE FROM message_status WHERE user_id = $1',
      [id]
    );
    
    // Delete task assignments
    await client.query(
      'DELETE FROM task_assignments WHERE user_id = $1',
      [id]
    );
    
    // Delete tasks created by user (or reassign - for now we'll delete)
    await client.query(
      'DELETE FROM tasks WHERE creator_id = $1',
      [id]
    );
    
    // Delete notifications
    await client.query(
      'DELETE FROM notifications WHERE user_id = $1',
      [id]
    );
    
    // Delete contacts
    await client.query(
      'DELETE FROM contacts WHERE user_id = $1',
      [id]
    );
    
    // Delete sessions
    await client.query(
      'DELETE FROM sessions WHERE user_id = $1',
      [id]
    );
    
    // Delete OTP verifications
    await client.query(
      'DELETE FROM otp_verifications WHERE mobile = (SELECT mobile FROM users WHERE id = $1)',
      [id]
    );
    
    // Finally delete the user
    await client.query(
      'DELETE FROM users WHERE id = $1',
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
 * Search users by name or mobile (for messaging)
 */
export async function searchUsersForChat(search: string, limit: number = 20) {
  if (!search || search.trim().length === 0) {
    return [];
  }

  const result = await query(
    `SELECT 
      id, mobile, name, role, status, profile_photo_url, bio
     FROM users
     WHERE status = 'active'
       AND (mobile ILIKE $1 OR name ILIKE $1)
     ORDER BY name ASC
     LIMIT $2`,
    [`%${search}%`, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    mobile: row.mobile,
    name: row.name,
    role: row.role,
    status: row.status,
    profilePhotoUrl: row.profile_photo_url,
    bio: row.bio,
  }));
}


