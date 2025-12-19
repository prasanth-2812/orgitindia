import { Router } from 'express';
import {
  requestOTP,
  verifyOTPAndLogin,
  loginWithPassword,
  setupProfile,
  syncUserContacts,
  getCurrentUser,
} from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { body } from 'express-validator';

const router = Router();

// Public routes
router.post(
  '/request-otp',
  [
    body('mobile')
      .matches(/^\+\d{6,20}$/)
      .withMessage('Mobile number must be in international format (e.g., +911234567890)'),
  ],
  requestOTP
);

router.post(
  '/verify-otp',
  [
    body('mobile')
      .matches(/^\+\d{6,20}$/)
      .withMessage('Mobile number must be in international format (e.g., +911234567890)'),
    body('otpCode')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must be numeric'),
  ],
  verifyOTPAndLogin
);

router.post(
  '/login',
  [
    body('mobile')
      .matches(/^\+\d{6,20}$/)
      .withMessage('Mobile number must be in international format (e.g., +911234567890)'),
    body('password')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Password is required'),
  ],
  loginWithPassword
);

// Protected routes
router.get('/me', authenticate, getCurrentUser);

router.put(
  '/profile',
  authenticate,
  [
    body('name')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Name is required'),
  ],
  setupProfile
);

router.post(
  '/contacts/sync',
  authenticate,
  [
    body('contacts')
      .isArray()
      .withMessage('Contacts must be an array'),
    body('contacts.*.name')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Contact name is required'),
    body('contacts.*.mobile')
      .isLength({ min: 10, max: 10 })
      .withMessage('Contact mobile must be 10 digits')
      .isNumeric()
      .withMessage('Contact mobile must be numeric'),
  ],
  syncUserContacts
);

export default router;

