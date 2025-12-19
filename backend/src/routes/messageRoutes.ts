import { Router } from 'express';
import {
  sendMessage,
  getChatMessages,
  markAsRead,
  editMessageHandler,
  deleteMessageHandler,
  togglePin,
  toggleStar,
  searchMessagesHandler,
} from '../controllers/messageController';
import { authenticate } from '../middleware/authMiddleware';
import { body, query as queryValidator } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(
  '/send',
  [
    body('messageType').isIn(['text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'voice_note']),
    body('visibilityMode').optional().isIn(['org_only', 'shared_to_group']),
  ],
  sendMessage
);

router.get(
  '/',
  [
    queryValidator('receiverId').optional().isUUID(),
    queryValidator('groupId').optional().isUUID(),
    queryValidator('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  getChatMessages
);

router.post('/mark-read', markAsRead);

router.put('/:messageId/edit', [body('content').trim().isLength({ min: 1 })], editMessageHandler);

router.delete('/:messageId', deleteMessageHandler);

router.post('/:messageId/pin', [body('groupId').isUUID(), body('isPinned').isBoolean()], togglePin);

router.post('/:messageId/star', [body('isStarred').isBoolean()], toggleStar);

router.get(
  '/search',
  [
    queryValidator('q').trim().isLength({ min: 1 }),
    queryValidator('receiverId').optional().isUUID(),
    queryValidator('groupId').optional().isUUID(),
  ],
  searchMessagesHandler
);

export default router;

