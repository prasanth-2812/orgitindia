import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  createDocumentInstance,
  getDocumentInstances,
  getDocumentInstanceById,
  updateDocumentInstance,
  deleteDocumentInstance,
  downloadDocumentInstance,
} from '../services/documentInstanceService';

/**
 * Create new document instance from template
 * POST /api/document-instances
 */
export async function createInstance(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { templateId, filledData, title, status } = req.body;

    if (!templateId || !filledData || !title) {
      return res.status(400).json({
        success: false,
        error: 'templateId, filledData, and title are required',
      });
    }

    const instance = await createDocumentInstance(
      templateId,
      filledData,
      title,
      userId,
      organizationId
    );

    // If status is provided and is 'final', update it
    if (status === 'final') {
      const updated = await updateDocumentInstance(instance.id, filledData, title, 'final', userId);
      if (updated) {
        return res.json({
          success: true,
          data: updated,
        });
      }
    }

    res.json({
      success: true,
      data: instance,
    });
  } catch (error: any) {
    console.error('Create document instance error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create document instance',
    });
  }
}

/**
 * Get document instances with filters
 * GET /api/document-instances
 */
export async function getInstances(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;
    const userRole = req.user?.role || 'employee';

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const filters = {
      status: req.query.status as 'draft' | 'final' | 'archived' | undefined,
      templateId: req.query.templateId as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await getDocumentInstances(
      organizationId || '',
      userId,
      userRole,
      filters
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Get document instances error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get document instances',
    });
  }
}

/**
 * Get document instance by ID
 * GET /api/document-instances/:id
 */
export async function getInstanceById(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;
    const userRole = req.user?.role || 'employee';
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const instance = await getDocumentInstanceById(id, userId, userRole, organizationId);

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Document instance not found',
      });
    }

    res.json({
      success: true,
      data: instance,
    });
  } catch (error: any) {
    console.error('Get document instance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get document instance',
    });
  }
}

/**
 * Update document instance
 * PUT /api/document-instances/:id
 */
export async function updateInstance(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { filledData, title, status } = req.body;

    // If only status is being updated, use existing filledData
    // Otherwise, filledData is required
    if (!filledData && !status) {
      return res.status(400).json({
        success: false,
        error: 'filledData or status is required',
      });
    }

    // Get existing instance to use its filledData if only status is being updated
    let dataToUpdate = filledData;
    if (!filledData && status) {
      const existing = await getDocumentInstanceById(id, userId || '', req.user?.role || 'employee', req.user?.organizationId);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Document instance not found',
        });
      }
      dataToUpdate = existing.filledData;
    }

    const updated = await updateDocumentInstance(id, dataToUpdate || {}, title, status, userId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Document instance not found or cannot be updated',
      });
    }

    res.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update document instance error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update document instance',
    });
  }
}

/**
 * Delete/archive document instance
 * DELETE /api/document-instances/:id
 */
export async function deleteInstance(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;
    const userRole = req.user?.role || 'employee';
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const deleted = await deleteDocumentInstance(id, userId, userRole, organizationId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Document instance not found',
      });
    }

    res.json({
      success: true,
      message: 'Document instance archived successfully',
    });
  } catch (error: any) {
    console.error('Delete document instance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete document instance',
    });
  }
}

/**
 * Download document instance PDF
 * GET /api/document-instances/:id/download
 */
export async function downloadInstance(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const organizationId = req.user?.organizationId;
    const userRole = req.user?.role || 'employee';
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const pdfBuffer = await downloadDocumentInstance(id, userId, userRole, organizationId);

    if (!pdfBuffer) {
      return res.status(404).json({
        success: false,
        error: 'PDF not found',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="document-${id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Download document instance error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download document',
    });
  }
}


