import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { query } from '../config/database';

/**
 * Middleware to allow both Admin and Super Admin roles
 */
export const isAdminOrSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Admin or Super Admin access required',
    });
  }

  next();
};

/**
 * Middleware to ensure Admin has an organization_id
 */
export const requireOrganization = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
    });
  }

  // Super Admin doesn't need organization
  if (req.user.role === 'super_admin') {
    return next();
  }

  // Admin must have organization_id
  if (req.user.role === 'admin') {
    // Get user's organization from user_organizations table
    const orgResult = await query(
      `SELECT organization_id FROM user_organizations 
       WHERE user_id = $1 
       LIMIT 1`,
      [req.user.userId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: User is not associated with any organization',
      });
    }

    // Attach organization_id to request
    req.user.organizationId = orgResult.rows[0].organization_id;
  }

  next();
};

/**
 * Helper to check if Admin can access organization resource
 * Note: This is used for read access. Admins can view GLOBAL resources (read-only).
 * For write access, use canEditCompliance instead.
 */
export const checkOrganizationAccess = async (
  userId: string,
  userRole: string,
  resourceOrganizationId: string | null | undefined
): Promise<boolean> => {
  // Super Admin can access everything
  if (userRole === 'super_admin') {
    return true;
  }

  // Admin can view GLOBAL resources (read-only) and their own org resources
  if (userRole === 'admin') {
    // GLOBAL resources (organizationId is null) are accessible for read
    if (!resourceOrganizationId) {
      return true; // Admin can view GLOBAL compliances
    }

    // Check if user belongs to the same organization
    const orgResult = await query(
      `SELECT organization_id FROM user_organizations 
       WHERE user_id = $1 AND organization_id = $2 
       LIMIT 1`,
      [userId, resourceOrganizationId]
    );

    return orgResult.rows.length > 0;
  }

  // Employee can also view GLOBAL and their org resources
  if (userRole === 'employee') {
    if (!resourceOrganizationId) {
      return true; // Employee can view GLOBAL compliances
    }

    const orgResult = await query(
      `SELECT organization_id FROM user_organizations 
       WHERE user_id = $1 AND organization_id = $2 
       LIMIT 1`,
      [userId, resourceOrganizationId]
    );

    return orgResult.rows.length > 0;
  }

  return false;
};

/**
 * Helper to check if user can edit compliance
 */
export const canEditCompliance = async (
  userId: string,
  userRole: string,
  complianceScope: string,
  complianceOrganizationId: string | null | undefined
): Promise<boolean> => {
  // Super Admin can only edit GLOBAL compliances
  if (userRole === 'super_admin') {
    return complianceScope === 'GLOBAL';
  }

  // Admin can only edit ORG compliances of their organization
  if (userRole === 'admin') {
    if (complianceScope !== 'ORG' || !complianceOrganizationId) {
      return false;
    }

    // Check if user belongs to the same organization
    const orgResult = await query(
      `SELECT organization_id FROM user_organizations 
       WHERE user_id = $1 AND organization_id = $2 
       LIMIT 1`,
      [userId, complianceOrganizationId]
    );

    return orgResult.rows.length > 0;
  }

  return false;
};

