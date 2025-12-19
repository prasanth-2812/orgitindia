import { Router } from 'express';
import {
  createTaskHandler,
  getTaskHandler,
  getUserTasksHandler,
  acceptTaskHandler,
  rejectTaskHandler,
  completeTaskHandler,
  getTaskAssignmentsHandler,
  updateTaskHandler,
} from '../controllers/taskController';
import { getMentionableTasksHandler } from '../controllers/taskMentionController';
import {
  linkComplianceToTask,
  unlinkComplianceFromTask,
  getTaskCompliances,
} from '../controllers/taskComplianceController';
import { authenticate } from '../middleware/authMiddleware';
import { body, query as queryValidator } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(
  '/',
  [
    body('title').trim().isLength({ min: 1, max: 255 }),
    body('taskType').isIn(['one_time', 'recurring']),
    body('assignedUserIds').isArray().notEmpty(),
    body('category').optional().isIn(['general', 'document_management', 'compliance_management']),
  ],
  createTaskHandler
);

router.get(
  '/',
  [
    queryValidator('status').optional().isIn(['pending', 'in_progress', 'completed', 'rejected', 'overdue']),
    queryValidator('category').optional().isIn(['general', 'document_management', 'compliance_management']),
    queryValidator('taskType').optional().isIn(['one_time', 'recurring']),
    queryValidator('isSelfTask').optional().isBoolean(),
  ],
  getUserTasksHandler
);

router.get('/:taskId', getTaskHandler);

router.get('/:taskId/assignments', getTaskAssignmentsHandler);

router.post('/:taskId/accept', acceptTaskHandler);

router.post(
  '/:taskId/reject',
  [body('rejectionReason').trim().isLength({ min: 1 })],
  rejectTaskHandler
);

router.post('/:taskId/complete', completeTaskHandler);

router.put(
  '/:taskId',
  [
    body('title').optional().trim().isLength({ min: 1, max: 255 }),
  ],
  updateTaskHandler
);

router.get('/mentionable', getMentionableTasksHandler);

// Compliance linking routes
router.post('/:taskId/compliance', linkComplianceToTask);
router.delete('/:taskId/compliance/:complianceId', unlinkComplianceFromTask);
router.get('/:taskId/compliance', getTaskCompliances);

export default router;

