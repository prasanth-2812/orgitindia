import express from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/authMiddleware';
import { isAdminOrSuperAdmin } from '../middleware/adminMiddleware';
import { requireOrganization } from '../middleware/adminMiddleware';
import * as organizationController from '../controllers/organizationController';

const router = express.Router();

// Middleware to check if user is super_admin or admin
// Adapting check to allow super_admin to perform admin actions too if needed,
// but for now strictly following the requirement for role update.
const requireSuperAdmin = async (req: any, res: any, next: any) => {
    try {
        const result = await query('SELECT role FROM users WHERE id = $1', [req.user.userId]);
        if (result.rows.length === 0 || result.rows[0].role !== 'super_admin') {
            return res.status(403).json({ success: false, error: 'Access denied. Super Admin role required.' });
        }
        next();
    } catch (error) {
        console.error('Role check error:', error);
    }
};

// Update user role
router.put('/users/:id/role', authenticate, requireSuperAdmin, async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['admin', 'employee', 'super_admin'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        // Prevent changing own role
        if (id === req.user.userId) {
            return res.status(400).json({ success: false, error: 'Cannot change your own role' });
        }

        const result = await query(
            'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, role',
            [role, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({
            success: true,
            data: {
                message: 'Role updated successfully',
                user: result.rows[0],
            }
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Admin organization management - allows admins to create/update their own organization
router.post('/organization', authenticate, isAdminOrSuperAdmin, organizationController.createAdminOrganization);
router.get('/organization', authenticate, isAdminOrSuperAdmin, requireOrganization, organizationController.getAdminOrganization);
router.put('/organization', authenticate, isAdminOrSuperAdmin, requireOrganization, organizationController.updateAdminOrganization);

export default router;
