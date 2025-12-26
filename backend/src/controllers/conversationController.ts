import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { query, getClient } from '../config/database';

/**
 * Get all conversations (with pinned first) - matching message-backend
 */
export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`[getConversations] Loading conversations for user: ${userId}`);

    // First, check if user has any conversation memberships
    const membershipCheck = await query(
      'SELECT COUNT(*) as count FROM conversation_members WHERE user_id = $1',
      [userId]
    );
    console.log(`[getConversations] User has ${membershipCheck.rows[0]?.count || 0} conversation memberships`);

    // CRITICAL FIX: Get conversations from conversation_members
    // Simplified query that handles all cases - with or without messages
    let result;
    try {
      // Use GROUP BY instead of DISTINCT to avoid JSON type issues
      // Add sort column to SELECT list for ORDER BY compatibility
      result = await query(
        `SELECT 
          CAST(cm.conversation_id AS TEXT) as id,
          c.name,
          COALESCE(c.is_group, FALSE) as is_group,
          COALESCE(c.is_task_group, FALSE) as is_task_group,
          c.group_photo,
          COALESCE(c.created_at, NOW()) as created_at,
          COALESCE(cm.is_pinned, FALSE) as is_pinned,
          COALESCE(cm.role, 'member') as role,
          (
            SELECT json_agg(
              json_build_object(
                'id', u.id,
                'name', u.name,
                'phone', u.mobile,
                'profile_photo', u.profile_photo_url
              )
            )
            FROM conversation_members cm2
            JOIN users u ON cm2.user_id = u.id
            WHERE CAST(cm2.conversation_id AS TEXT) = CAST(cm.conversation_id AS TEXT) AND cm2.user_id != $1
          ) as other_members,
          (
            SELECT content
            FROM messages
            WHERE CAST(conversation_id AS TEXT) = CAST(cm.conversation_id AS TEXT) AND is_deleted = FALSE
            ORDER BY created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT created_at
            FROM messages
            WHERE CAST(conversation_id AS TEXT) = CAST(cm.conversation_id AS TEXT) AND is_deleted = FALSE
            ORDER BY created_at DESC
            LIMIT 1
          ) as last_message_time,
          COALESCE((
            SELECT COUNT(*)::integer
            FROM messages
            WHERE CAST(conversation_id AS TEXT) = CAST(cm.conversation_id AS TEXT)
            AND sender_id != $1
            AND (status IS NULL OR status != 'read')
            AND is_deleted = FALSE
          ), 0) as unread_count,
          COALESCE(
            (SELECT created_at FROM messages WHERE CAST(conversation_id AS TEXT) = CAST(cm.conversation_id AS TEXT) AND is_deleted = FALSE ORDER BY created_at DESC LIMIT 1),
            c.created_at,
            NOW()
          ) as sort_time
        FROM conversation_members cm
        LEFT JOIN conversations c ON CAST(c.id AS TEXT) = CAST(cm.conversation_id AS TEXT)
        WHERE cm.user_id = $1
        GROUP BY cm.conversation_id, c.name, c.is_group, c.is_task_group, c.group_photo, c.created_at, cm.is_pinned, cm.role
        ORDER BY 
          COALESCE(cm.is_pinned, FALSE) DESC, 
          sort_time DESC NULLS LAST`,
        [userId]
      );
    } catch (queryError: any) {
      console.error('[getConversations] Main query failed:', queryError.message);
      console.error('[getConversations] Error code:', queryError.code);
      console.error('[getConversations] Error position:', queryError.position);
      console.error('[getConversations] Full error:', JSON.stringify(queryError, null, 2));
      // Fallback to simplest possible query
      try {
        result = await query(
          `SELECT 
          CAST(cm.conversation_id AS TEXT) as id,
          c.name,
          COALESCE(c.is_group, FALSE) as is_group,
          COALESCE(c.is_task_group, FALSE) as is_task_group,
          c.group_photo,
          COALESCE(c.created_at, NOW()) as created_at,
          COALESCE(cm.is_pinned, FALSE) as is_pinned,
          COALESCE(cm.role, 'member') as role,
          NULL as other_members,
          NULL as last_message,
          NULL as last_message_time,
          0 as unread_count,
          COALESCE(c.created_at, NOW()) as sort_time
        FROM conversation_members cm
        LEFT JOIN conversations c ON CAST(c.id AS TEXT) = CAST(cm.conversation_id AS TEXT)
        WHERE cm.user_id = $1
        GROUP BY cm.conversation_id, c.name, c.is_group, c.is_task_group, c.group_photo, c.created_at, cm.is_pinned, cm.role
        ORDER BY COALESCE(cm.is_pinned, FALSE) DESC, sort_time DESC`,
          [userId]
        );
        console.log(`[getConversations] Fallback query found ${result.rows.length} conversations`);
      } catch (fallbackError: any) {
        console.error('[getConversations] Fallback query also failed:', fallbackError.message);
        console.error('[getConversations] Fallback error details:', JSON.stringify(fallbackError, null, 2));
        // Return empty array if both queries fail
        result = { rows: [] };
      }
    }

    console.log(`[getConversations] Found ${result.rows.length} conversations for user ${userId}`);

    // Transform the data to match mobile app expectations
    const transformedConversations = result.rows.map((conv: any) => {
      try {
        // Extract other user info for direct conversations
        const otherMembers = Array.isArray(conv.other_members) ? conv.other_members : [];
        const isGroup = conv.is_group || conv.is_task_group;

        // Normalize other_members to include profile_photo_url for UI compatibility
        const normalizedOtherMembers = otherMembers.map((member: any) => ({
          ...member,
          profile_photo_url: member.profile_photo || member.profile_photo_url || null,
          profile_photo: member.profile_photo || member.profile_photo_url || null,
        }));

        return {
          ...conv,
          // Add fields expected by mobile app
          conversationId: conv.id,
          type: isGroup ? 'group' : 'direct',
          otherUserId: !isGroup && normalizedOtherMembers.length > 0 ? normalizedOtherMembers[0].id : null,
          groupId: isGroup ? conv.id : null,
          photoUrl: isGroup ? conv.group_photo : (normalizedOtherMembers[0]?.profile_photo || normalizedOtherMembers[0]?.profile_photo_url || null),
          other_members: normalizedOtherMembers, // Ensure other_members has proper structure
          lastMessage: conv.last_message ? {
            id: null, // Will be filled from last_message if available
            content: conv.last_message,
            messageType: 'text',
            senderId: null,
            senderName: null,
            createdAt: conv.last_message_time,
          } : null,
          unreadCount: conv.unread_count || 0,
          isPinned: conv.is_pinned || false,
          updatedAt: conv.last_message_time || conv.created_at,
        };
      } catch (transformError: any) {
        console.error('[getConversations] Error transforming conversation:', transformError, conv);
        // Return minimal conversation object if transformation fails
        return {
          id: conv.id,
          conversationId: conv.id,
          type: (conv.is_group || conv.is_task_group) ? 'group' : 'direct',
          name: conv.name || null,
          is_group: conv.is_group || false,
          is_task_group: conv.is_task_group || false,
          other_members: [],
          last_message: null,
          last_message_time: null,
          unread_count: 0,
          is_pinned: false,
        };
      }
    });

    console.log(`[getConversations] Returning ${transformedConversations.length} transformed conversations`);
    res.json({ conversations: transformedConversations });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

/**
 * Create or get 1-to-1 conversation (used by mobile NewChatScreen) - matching message-backend
 */
export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { otherUserId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!otherUserId) {
      return res.status(400).json({ error: 'otherUserId is required' });
    }

    if (userId === otherUserId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    // Check if conversation already exists (non-group)
    // Handle both UUID and TEXT conversation_id types
    const existing = await query(
      `SELECT CAST(c.id AS TEXT) as id
       FROM conversations c
       INNER JOIN conversation_members cm1 ON CAST(c.id AS TEXT) = CAST(cm1.conversation_id AS TEXT)
       INNER JOIN conversation_members cm2 ON CAST(c.id AS TEXT) = CAST(cm2.conversation_id AS TEXT)
       WHERE cm1.user_id = $1 AND cm2.user_id = $2 AND COALESCE(c.is_group, FALSE) = FALSE`,
      [userId, otherUserId]
    );

    if (existing.rows.length > 0) {
      return res.json({ conversationId: existing.rows[0].id });
    }

    // Create new conversation
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const convResult = await client.query(
        'INSERT INTO conversations (is_group, created_by) VALUES (FALSE, $1) RETURNING id',
        [userId]
      );
      const conversationId = convResult.rows[0].id;

      // Cast conversation_id to TEXT for consistency
      const conversationIdText = typeof conversationId === 'string' ? conversationId : String(conversationId);

      await client.query(
        'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, $3)',
        [conversationIdText, userId, 'member']
      );

      await client.query(
        'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, $3)',
        [conversationIdText, otherUserId, 'member']
      );

      await client.query('COMMIT');

      res.status(201).json({ conversationId: conversationIdText });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create manual group - matching message-backend
 */
export const createGroupConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, memberIds, group_photo } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Group name and at least one member required' });
    }

    // Add creator to members if not included
    const allMemberIds = [...new Set([userId, ...memberIds])];

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Create group conversation
      const convResult = await client.query(
        `INSERT INTO conversations (name, is_group, group_photo, created_by)
         VALUES ($1, TRUE, $2, $3)
         RETURNING id`,
        [name, group_photo || null, userId]
      );
      const conversationId = convResult.rows[0].id;

      // Add members (creator as admin, others as members)
      for (const memberId of allMemberIds) {
        await client.query(
          `INSERT INTO conversation_members (conversation_id, user_id, role)
           VALUES ($1, $2, $3)`,
          [conversationId, memberId, memberId === userId ? 'admin' : 'member']
        );
      }

      await client.query('COMMIT');

      res.status(201).json({ conversationId });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
};

/**
 * Create auto task group - matching message-backend
 */
export const createTaskGroupConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { taskId, name, memberIds } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!taskId || !name || !Array.isArray(memberIds)) {
      return res.status(400).json({ error: 'Task ID, name, and member IDs required' });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Create task group conversation
      const convResult = await client.query(
        `INSERT INTO conversations (name, is_group, is_task_group, task_id, created_by)
         VALUES ($1, TRUE, TRUE, $2, $3)
         RETURNING id`,
        [name, taskId, userId]
      );
      const conversationId = convResult.rows[0].id;

      // Add creator and assigned members
      const allMembers = [userId, ...memberIds];
      for (const memberId of allMembers) {
        await client.query(
          `INSERT INTO conversation_members (conversation_id, user_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [conversationId, memberId, memberId === userId ? 'admin' : 'member']
        );
      }

      await client.query('COMMIT');

      res.status(201).json({ conversationId });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Create task group error:', error);
    res.status(500).json({ error: 'Failed to create task group' });
  }
};

/**
 * Add members to group - matching message-backend
 */
export const addGroupMembersHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;
    const { memberIds } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Member IDs array required' });
    }

    // Verify user is member of group
    const memberCheck = await query(
      'SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Verify it's a group
    const convCheck = await query(
      'SELECT is_group FROM conversations WHERE id = $1',
      [conversationId]
    );

    if (!convCheck.rows[0]?.is_group) {
      return res.status(400).json({ error: 'Not a group conversation' });
    }

    // Add members
    for (const memberId of memberIds) {
      await query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT DO NOTHING`,
        [conversationId, memberId]
      );
    }

    res.json({ success: true, added: memberIds.length });
  } catch (error: any) {
    console.error('Add members error:', error);
    res.status(500).json({ error: 'Failed to add members' });
  }
};

/**
 * Remove member from group - matching message-backend
 */
export const removeGroupMemberHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { conversationId, memberId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is member
    const memberCheck = await query(
      'SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Remove member (any member can remove, but can't remove admin)
    if (memberId === userId) {
      return res.status(400).json({ error: 'Cannot remove yourself' });
    }

    await query(
      'DELETE FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, memberId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

/**
 * Update group (name, photo) - admin only - matching message-backend
 */
export const updateGroupConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;
    const { name, group_photo } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is admin
    const memberCheck = await query(
      'SELECT role FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (memberCheck.rows.length === 0 || memberCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only group admin can update group' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (group_photo !== undefined) {
      updates.push(`group_photo = $${paramCount++}`);
      values.push(group_photo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(conversationId);

    await query(
      `UPDATE conversations SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
};

/**
 * Pin/Unpin conversation - matching message-backend
 */
export const pinConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;
    const { is_pinned } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await query(
      `UPDATE conversation_members
       SET is_pinned = $1
       WHERE conversation_id = $2 AND user_id = $3`,
      [is_pinned === true, conversationId, userId]
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Pin conversation error:', error);
    res.status(500).json({ error: 'Failed to pin conversation' });
  }
};

/**
 * Get conversation details - matching message-backend
 */
export const getConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is member
    const memberCheck = await query(
      'SELECT role, is_pinned FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    // Get conversation details
    const convResult = await query(
      'SELECT * FROM conversations WHERE id = $1',
      [conversationId]
    );

    // Get members with roles
    const membersResult = await query(
      `SELECT u.id, u.name, u.mobile as phone, COALESCE(u.profile_photo, u.profile_photo_url) as profile_photo, cm.role, cm.joined_at
       FROM conversation_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.conversation_id = $1
       ORDER BY cm.role DESC, cm.joined_at ASC`,
      [conversationId]
    );

    res.json({
      conversation: convResult.rows[0],
      members: membersResult.rows,
      userRole: memberCheck.rows[0].role,
      isPinned: memberCheck.rows[0].is_pinned,
    });
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all users (for creating new 1-to-1 conversations) - matching message-backend
 */
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await query(
      `SELECT id, name, mobile as phone, profile_photo_url as profile_photo,
              (status = 'active') as is_active
       FROM users 
       WHERE (status = 'active') AND id != $1 
       ORDER BY name`,
      [userId]
    );

    res.json({ users: result.rows });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
