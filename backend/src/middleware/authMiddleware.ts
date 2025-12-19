import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';
import { query } from '../config/database';

export interface AuthRequest extends Request {
  user?: JWTPayload & {
    organizationId?: string;
  };
}

/**
 * Authentication middleware
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = verifyToken(token);

    // Check if session is still active
    const sessionResult = await query(
      `SELECT is_active, expires_at FROM sessions 
       WHERE user_id = $1 AND token = $2 AND is_active = true`,
      [decoded.userId, token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session',
      });
    }

    const session = sessionResult.rows[0];
    if (new Date(session.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        error: 'Session expired',
      });
    }

    // Attach user info to request
    req.user = decoded;

    next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed',
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient permissions',
      });
    }

    next();
  };
};

/**
 * Helper function to check if user is super admin
 */
export const isSuperAdmin = (req: AuthRequest): boolean => {
  return req.user?.role === 'super_admin';
};

