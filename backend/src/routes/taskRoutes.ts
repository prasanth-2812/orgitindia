import { Router } from 'express';
import {
  getTasks,
  getTask,
  createTask,
  acceptTask,
  rejectTask,
  updateTaskStatus,
  updateTask,
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

// Get all tasks - matching message-backend
router.get(
  '/',
  [
    queryValidator('type').optional().isIn(['one_time', 'recurring']),
    queryValidator('status').optional().isIn(['pending', 'in_progress', 'completed', 'rejected']),
    queryValidator('priority').optional().isIn(['high', 'medium', 'low']),
  ],
  getTasks
);

// Get a single task by ID - matching message-backend
router.get('/:id', getTask);

// Create a new task - matching message-backend
router.post(
  '/',
  [
    body('title').trim().isLength({ min: 1 }),
    body('due_date').notEmpty(),
    body('task_type').optional().isIn(['one_time', 'recurring']),
    body('priority').optional().isIn(['high', 'medium', 'low']),
    body('assignee_ids').optional().isArray(),
  ],
  createTask
);

// Accept a task - matching message-backend
router.post('/:id/accept', acceptTask);

// Reject a task - matching message-backend
router.post(
  '/:id/reject',
  [body('reason').trim().isLength({ min: 1 })],
  rejectTask
);

// Update task status - matching message-backend
router.patch(
  '/:id/status',
  [
    body('status').isIn(['pending', 'in_progress', 'completed', 'rejected']),
  ],
  updateTaskStatus
);

// Update task - matching message-backend
router.patch('/:id', updateTask);

// Compliance linking routes
router.post('/:taskId/compliance', linkComplianceToTask);
router.delete('/:taskId/compliance/:complianceId', unlinkComplianceFromTask);
router.get('/:taskId/compliance', getTaskCompliances);

export default router;

