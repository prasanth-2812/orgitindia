import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { isAdminOrSuperAdmin, requireOrganization } from '../middleware/adminMiddleware';
import * as complianceController from '../controllers/complianceController';
import { upload } from '../services/complianceDocumentService';

const router = Router();

// All routes require authentication and Admin/Super Admin role
router.use(authenticate);
router.use(isAdminOrSuperAdmin);
router.use(requireOrganization);

// Compliance CRUD
router.get('/', complianceController.getAllComplianceItems);
router.get('/categories', complianceController.getComplianceCategories);
router.get('/:id', complianceController.getComplianceItemById);
router.post('/', complianceController.createComplianceItem);
router.put('/:id', complianceController.updateComplianceItem);
router.patch('/:id/status', complianceController.updateComplianceStatus);
router.delete('/:id', complianceController.deleteComplianceItem);

// Document routes
router.post('/:id/documents', upload.single('file'), complianceController.uploadComplianceDocument);
router.get('/:id/documents', complianceController.getComplianceDocuments);
router.delete('/:id/documents/:docId', complianceController.deleteComplianceDocument);

export default router;
