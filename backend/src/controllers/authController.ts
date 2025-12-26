import { Request, Response } from 'express';
import { query } from '../config/database';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { createOTPVerification, verifyOTP, isOTPVerified } from '../services/otpService';
import { syncContacts } from '../services/contactSyncService';
import { hashPassword, comparePassword } from '../utils/password';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request OTP for registration/login
 */
export const requestOTP = async (req: Request, res: Response) => {
  try {
    const { mobile } = req.body;

    // Validate mobile number (basic check: must start with + and have at least a few digits)
    if (!mobile || !/^\+\d{6,20}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number.',
      });
    }

    // Generate and send OTP
    const otpCode = await createOTPVerification(mobile);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // In production, don't send OTP in response
      // For development/testing only:
      ...(process.env.NODE_ENV === 'development' && { otpCode }),
    });
  } catch (error: any) {
    console.error('Request OTP error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send OTP',
    });
  }
};

/**
 * Verify OTP and create/login user
 */
export const verifyOTPAndLogin = async (req: Request, res: Response) => {
  try {
    const { mobile, otpCode, deviceId, deviceType, password } = req.body;

    // Validate inputs
    if (!mobile || !/^\+\d{6,20}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number',
      });
    }

    if (!otpCode || !/^\d{6}$/.test(otpCode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP code. Must be 6 digits.',
      });
    }

    // Verify OTP
    await verifyOTP(mobile, otpCode);

    // Check if user exists
    let userResult = await query('SELECT * FROM users WHERE mobile = $1', [mobile]);

    let user;
    if (userResult.rows.length === 0) {
      // Create new user
      let passwordHash = null;
      if (password) {
        // Hash password if provided during registration
        passwordHash = await hashPassword(password);
      }
      
      const newUserResult = await query(
        `INSERT INTO users (id, mobile, name, role, status, password_hash)
         VALUES (gen_random_uuid(), $1, $2, 'employee', 'active', $3)
         RETURNING *`,
        [mobile, `User ${mobile}`, passwordHash] // Default name, will be updated in profile setup
      );
      user = newUserResult.rows[0];
    } else {
      user = userResult.rows[0];
      // If user exists and password is provided, update password hash
      if (password && !user.password_hash) {
        const passwordHash = await hashPassword(password);
        await query(
          `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
          [passwordHash, user.id]
        );
        user.password_hash = passwordHash;
      }
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'User account is not active',
      });
    }

    // Get user's primary organization (for now, we'll create a default one if needed)
    let orgResult = await query(
      `SELECT uo.organization_id 
       FROM user_organizations uo 
       WHERE uo.user_id = $1 
       LIMIT 1`,
      [user.id]
    );

    let organizationId: string | undefined;
    if (orgResult.rows.length === 0) {
      // Create default organization for user (simplified - in production, admin should assign)
      const defaultOrgResult = await query(
        `INSERT INTO organizations (id, name) 
         VALUES (gen_random_uuid(), $1)
         RETURNING id`,
        [`Org ${mobile}`]
      );
      organizationId = defaultOrgResult.rows[0].id;

      await query(
        `INSERT INTO user_organizations (id, user_id, organization_id)
         VALUES (gen_random_uuid(), $1, $2)`,
        [user.id, organizationId]
      );
    } else {
      organizationId = orgResult.rows[0].organization_id;
    }

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
      organizationId,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
      organizationId,
    });

    // Create or update session (always create session for authentication middleware)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Use provided deviceId/deviceType or generate defaults
    const finalDeviceId = deviceId || `default-${user.id}`;
    const finalDeviceType = deviceType || 'mobile';

    // Check if session exists
    const sessionResult = await query(
      `SELECT id FROM sessions 
       WHERE user_id = $1 AND device_id = $2 AND is_active = true`,
      [user.id, finalDeviceId]
    );

    if (sessionResult.rows.length > 0) {
      // Update existing session
      await query(
        `UPDATE sessions 
         SET token = $1, refresh_token = $2, expires_at = $3, last_activity = NOW()
         WHERE id = $4`,
        [token, refreshToken, expiresAt, sessionResult.rows[0].id]
      );
    } else {
      // Create new session
      await query(
        `INSERT INTO sessions (id, user_id, device_id, device_type, token, refresh_token, expires_at, is_active)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true)`,
        [user.id, finalDeviceId, finalDeviceType, token, refreshToken, expiresAt]
      );
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          mobile: user.mobile,
          name: user.name,
          role: user.role,
          status: user.status,
          profilePhotoUrl: user.profile_photo_url,
          bio: user.bio,
          organizationId: organizationId,
        },
        token,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      },
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'OTP verification failed',
    });
  }
};

/**
 * Login with password
 */
export const loginWithPassword = async (req: Request, res: Response) => {
  try {
    const { mobile, password, deviceId, deviceType } = req.body;

    // Validate inputs
    if (!mobile || !/^\+\d{6,20}$/.test(mobile)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number',
      });
    }

    if (!password || password.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    // Find user by mobile
    const userResult = await query('SELECT * FROM users WHERE mobile = $1', [mobile]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid mobile number or password',
      });
    }

    const user = userResult.rows[0];

    // Check if user has password set
    if (!user.password_hash) {
      return res.status(401).json({
        success: false,
        error: 'Password not set for this account. Please use OTP login.',
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid mobile number or password',
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'User account is not active',
      });
    }

    // Get user's primary organization
    let orgResult = await query(
      `SELECT uo.organization_id 
       FROM user_organizations uo 
       WHERE uo.user_id = $1 
       LIMIT 1`,
      [user.id]
    );

    let organizationId: string | undefined;
    if (orgResult.rows.length === 0) {
      // Create default organization for user (simplified - in production, admin should assign)
      const defaultOrgResult = await query(
        `INSERT INTO organizations (id, name) 
         VALUES (gen_random_uuid(), $1)
         RETURNING id`,
        [`Org ${mobile}`]
      );
      organizationId = defaultOrgResult.rows[0].id;

      await query(
        `INSERT INTO user_organizations (id, user_id, organization_id)
         VALUES (gen_random_uuid(), $1, $2)`,
        [user.id, organizationId]
      );
    } else {
      organizationId = orgResult.rows[0].organization_id;
    }

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
      organizationId,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
      organizationId,
    });

    // Create or update session (always create session for authentication middleware)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Use provided deviceId/deviceType or generate defaults
    const finalDeviceId = deviceId || `default-${user.id}`;
    const finalDeviceType = deviceType || 'mobile';

    // Check if session exists
    const sessionResult = await query(
      `SELECT id FROM sessions 
       WHERE user_id = $1 AND device_id = $2 AND is_active = true`,
      [user.id, finalDeviceId]
    );

    if (sessionResult.rows.length > 0) {
      // Update existing session
      await query(
        `UPDATE sessions 
         SET token = $1, refresh_token = $2, expires_at = $3, last_activity = NOW()
         WHERE id = $4`,
        [token, refreshToken, expiresAt, sessionResult.rows[0].id]
      );
    } else {
      // Create new session
      await query(
        `INSERT INTO sessions (id, user_id, device_id, device_type, token, refresh_token, expires_at, is_active)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true)`,
        [user.id, finalDeviceId, finalDeviceType, token, refreshToken, expiresAt]
      );
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          mobile: user.mobile,
          name: user.name,
          role: user.role,
          status: user.status,
          profilePhotoUrl: user.profile_photo_url,
          bio: user.bio,
          organizationId: organizationId,
        },
        token,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      },
    });
  } catch (error: any) {
    console.error('Login with password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed',
    });
  }
};

/**
 * Setup user profile
 */
export const setupProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { name, profilePhotoUrl, bio, about, contact_number, profile_photo } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    // Use profile_photo if provided, otherwise profilePhotoUrl
    const photoUrl = profile_photo || profilePhotoUrl || null;
    // Use about if provided, otherwise bio
    const userBio = about || bio || null;

    const result = await query(
      `UPDATE users 
       SET name = $1, profile_photo_url = $2, bio = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, mobile, name, role, status, profile_photo_url, bio, created_at, updated_at`,
      [name, photoUrl, userBio, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: user,
      profile: {
        name: user.name,
        about: user.bio,
        contact_number: user.mobile,
        profile_photo: user.profile_photo_url,
      },
    });
  } catch (error: any) {
    console.error('Setup profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to setup profile',
    });
  }
};

/**
 * Register new user (for mobile app compatibility)
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    if (!phone || !/^\+\d{6,20}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number. Must be in international format (e.g., +911234567890)',
      });
    }

    if (!password || password.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE mobile = $1', [phone]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this mobile number already exists',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userResult = await query(
      `INSERT INTO users (id, mobile, name, role, status, password_hash)
       VALUES (gen_random_uuid(), $1, $2, 'employee', 'active', $3)
       RETURNING id, mobile, name, role, status, profile_photo_url, bio, created_at`,
      [phone, name, passwordHash]
    );

    const user = userResult.rows[0];

    // Get user's primary organization (or create default)
    let orgResult = await query(
      `SELECT uo.organization_id 
       FROM user_organizations uo 
       WHERE uo.user_id = $1 
       LIMIT 1`,
      [user.id]
    );

    let organizationId: string | undefined;
    if (orgResult.rows.length === 0) {
      // Create default organization for user
      const defaultOrgResult = await query(
        `INSERT INTO organizations (id, name) 
         VALUES (gen_random_uuid(), $1)
         RETURNING id`,
        [`Org ${phone}`]
      );
      organizationId = defaultOrgResult.rows[0].id;

      await query(
        `INSERT INTO user_organizations (id, user_id, organization_id)
         VALUES (gen_random_uuid(), $1, $2)`,
        [user.id, organizationId]
      );
    } else {
      organizationId = orgResult.rows[0].organization_id;
    }

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
      organizationId,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      mobile: user.mobile,
      role: user.role,
      organizationId,
    });

    // Create session (required for authentication middleware)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    const deviceId = `default-${user.id}`;
    const deviceType = 'mobile';

    await query(
      `INSERT INTO sessions (id, user_id, device_id, device_type, token, refresh_token, expires_at, is_active)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true)`,
      [user.id, deviceId, deviceType, token, refreshToken, expiresAt]
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        mobile: user.mobile,
        name: user.name,
        role: user.role,
        status: user.status,
        profilePhotoUrl: user.profile_photo_url,
        bio: user.bio,
        organizationId: organizationId,
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { userId: targetUserId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const result = await query(
      `SELECT id, mobile, name, role, status, profile_photo_url, bio, created_at
       FROM users WHERE id = $1 AND status = 'active'`,
      [targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        mobile: user.mobile,
        name: user.name,
        role: user.role,
        status: user.status,
        profilePhotoUrl: user.profile_photo_url,
        bio: user.bio,
      },
    });
  } catch (error: any) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user',
    });
  }
};

/**
 * Sync contacts
 */
export const syncUserContacts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { contacts } = req.body;

    if (!Array.isArray(contacts)) {
      return res.status(400).json({
        success: false,
        error: 'Contacts must be an array',
      });
    }

    // Validate contacts format
    const validContacts = contacts.filter(
      (c: any) => c.name && c.mobile && /^\d{10}$/.test(c.mobile)
    );

    await syncContacts(userId, validContacts);

    res.json({
      success: true,
      message: 'Contacts synced successfully',
    });
  } catch (error: any) {
    console.error('Sync contacts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync contacts',
    });
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const result = await query('SELECT * FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const userRow = result.rows[0];

    // Get user's organization ID
    const orgResult = await query(
      `SELECT organization_id FROM user_organizations WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const organizationId = orgResult.rows[0]?.organization_id || null;

    // Format response to match frontend User interface
    res.json({
      success: true,
      data: {
        id: userRow.id,
        mobile: userRow.mobile,
        name: userRow.name,
        role: userRow.role,
        status: userRow.status,
        profilePhotoUrl: userRow.profile_photo_url || undefined,
        bio: userRow.bio || undefined,
        organizationId: organizationId || undefined,
      },
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user',
    });
  }
};

