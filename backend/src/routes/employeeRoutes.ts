import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { isAdminOrSuperAdmin, requireOrganization } from '../middleware/adminMiddleware';
import * as employeeController from '../controllers/employeeController';

const router = Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(isAdminOrSuperAdmin);
router.use(requireOrganization);

// Employee management
router.get('/', employeeController.getEmployees);
router.post('/', employeeController.addEmployee);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.removeEmployee);

export default router;

