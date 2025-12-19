import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

/**
 * Middleware to check if user is a super admin
 */
export const isSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Super admin access required',
    });
  }

  next();
};

