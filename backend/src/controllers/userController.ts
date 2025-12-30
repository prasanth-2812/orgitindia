import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as userService from '../services/userService';

/**
 * Get all users (super admin only)
 */
export async function getAllUsers(req: AuthRequest, res: Response) {
  try {
    const filters = {
      role: req.query.role as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await userService.getAllUsers(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get users',
    });
  }
}

/**
 * Get user by ID
 */
export async function getUserById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user',
    });
  }
}

/**
 * Delete user
 */
export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    
    // Prevent deleting yourself
    if (id === req.user?.userId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account',
      });
    }

    await userService.deleteUser(id);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete user',
    });
  }
}

/**
 * Update user role (super admin only)
 */
export async function updateUserRole(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role is required',
      });
    }

    if (!['admin', 'employee', 'super_admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: admin, employee, super_admin',
      });
    }

    // Prevent changing own role
    if (id === req.user?.userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot change your own role',
      });
    }

    const { query } = await import('../config/database');
    const result = await query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, role',
      [role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Role updated successfully',
        user: result.rows[0],
      },
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user role',
    });
  }
}

/**
 * Search users for chat (any authenticated user)
 */
export async function searchUsersForChat(req: AuthRequest, res: Response) {
  try {
    const search = (req.query.q as string) || '';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (!search || search.trim().length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const users = await userService.searchUsersForChat(search, limit);

    return res.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error('Error searching users for chat:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to search users',
    });
  }
}


