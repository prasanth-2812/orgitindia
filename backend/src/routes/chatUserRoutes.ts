import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { searchUsersForChat } from '../controllers/userController';

const router = Router();

// All chat user search routes require authentication
router.use(authenticate);

// GET /api/chat/users?q=...&limit=...
router.get('/', searchUsersForChat);

export default router;


