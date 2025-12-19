import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as organizationService from '../services/organizationService';

/**
 * Get all organizations
 */
export async function getAllOrganizations(req: AuthRequest, res: Response) {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await organizationService.getAllOrganizations(filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting organizations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get organizations',
    });
  }
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const organization = await organizationService.getOrganizationById(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    res.json({
      success: true,
      data: organization,
    });
  } catch (error: any) {
    console.error('Error getting organization:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get organization',
    });
  }
}

/**
 * Create organization
 */
export async function createOrganization(req: AuthRequest, res: Response) {
  try {
    const {
      name,
      logoUrl,
      address,
      email,
      mobile,
      gst,
      pan,
      cin,
      accountingYearStart,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Organization name is required',
      });
    }

    const organization = await organizationService.createOrganization({
      name,
      logoUrl,
      address,
      email,
      mobile,
      gst,
      pan,
      cin,
      accountingYearStart,
    });

    res.status(201).json({
      success: true,
      data: organization,
    });
  } catch (error: any) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create organization',
    });
  }
}

/**
 * Update organization
 */
export async function updateOrganization(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      logoUrl,
      address,
      email,
      mobile,
      gst,
      pan,
      cin,
      accountingYearStart,
    } = req.body;

    const organization = await organizationService.updateOrganization(id, {
      name,
      logoUrl,
      address,
      email,
      mobile,
      gst,
      pan,
      cin,
      accountingYearStart,
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found',
      });
    }

    res.json({
      success: true,
      data: organization,
    });
  } catch (error: any) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update organization',
    });
  }
}

/**
 * Suspend organization
 */
export async function suspendOrganization(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await organizationService.suspendOrganization(id);

    res.json({
      success: true,
      message: 'Organization suspended successfully',
    });
  } catch (error: any) {
    console.error('Error suspending organization:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to suspend organization',
    });
  }
}

/**
 * Activate organization
 */
export async function activateOrganization(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await organizationService.activateOrganization(id);

    res.json({
      success: true,
      message: 'Organization activated successfully',
    });
  } catch (error: any) {
    console.error('Error activating organization:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to activate organization',
    });
  }
}

/**
 * Get organization users
 */
export async function getOrganizationUsers(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const users = await organizationService.getOrganizationUsers(id);

    res.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error('Error getting organization users:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get organization users',
    });
  }
}

/**
 * Get organization tasks
 */
export async function getOrganizationTasks(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const filters = {
      status: req.query.status as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await organizationService.getOrganizationTasks(id, filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error getting organization tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get organization tasks',
    });
  }
}

/**
 * Delete organization
 */
export async function deleteOrganization(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await organizationService.deleteOrganization(id);

    res.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete organization',
    });
  }
}

/**
 * Get organization statistics
 */
export async function getOrganizationStats(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const stats = await organizationService.getOrganizationStats(id);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error getting organization stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get organization statistics',
    });
  }
}

