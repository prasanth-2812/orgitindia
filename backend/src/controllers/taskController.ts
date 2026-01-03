import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { query, getClient } from '../config/database';

/**
 * Get all tasks for the authenticated user - matching message-backend
 */
export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { type, status, priority } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let querySQL = `
      SELECT 
        t.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'phone', u.mobile,
            'profile_photo', u.profile_photo_url,
            'accepted_at', ta.accepted_at,
            'has_accepted', CASE WHEN ta.accepted_at IS NOT NULL THEN true ELSE false END
          )
        ) FILTER (WHERE u.id IS NOT NULL) as assignees,
        (
          SELECT COUNT(*)
          FROM task_assignees ta2
          WHERE ta2.task_id = t.id AND ta2.accepted_at IS NOT NULL
        ) as accepted_count,
        (
          SELECT COUNT(*)
          FROM task_assignees ta2
          WHERE ta2.task_id = t.id
        ) as total_assignees,
        (
          SELECT jsonb_build_object(
            'accepted_at', ta3.accepted_at,
            'has_accepted', CASE WHEN ta3.accepted_at IS NOT NULL THEN true ELSE false END
          )
          FROM task_assignees ta3
          WHERE ta3.task_id = t.id AND ta3.user_id = $1
        ) as current_user_status,
        c.id as conversation_id,
        c.name as conversation_name
      FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      LEFT JOIN conversations c ON c.task_id = t.id AND c.is_task_group = TRUE
      WHERE (ta.user_id = $1 OR t.created_by = $1)
    `;

    const params: any[] = [userId];
    const conditions: string[] = [];

    // Filter by task type (one_time vs recurring)
    // Priority: task_type field takes precedence
    // - If task_type = 'one_time': always show in one_time (regardless of recurrence_type)
    // - If task_type = 'recurring': always show in recurring
    // - If task_type IS NULL: use recurrence_type to determine
    if (type === 'recurring') {
      // Show recurring tasks: explicitly marked as recurring OR (no type set AND has recurrence_type)
      conditions.push(`(t.task_type = $${params.length + 1} OR (t.task_type IS NULL AND t.recurrence_type IS NOT NULL))`);
      params.push('recurring');
    } else if (type === 'one_time') {
      // Show one-time tasks: explicitly marked as one_time OR (no type set AND no recurrence)
      conditions.push(`(t.task_type = $${params.length + 1} OR (t.task_type IS NULL AND t.recurrence_type IS NULL))`);
      params.push('one_time');
    }

    if (status) {
      conditions.push(`t.status = $${params.length + 1}`);
      params.push(status);
    }

    // Note: priority column doesn't exist in tasks table, so priority filter is removed
    // if (priority) {
    //   conditions.push(`t.priority = $${params.length + 1}`);
    //   params.push(priority);
    // }

    if (conditions.length > 0) {
      querySQL += ` AND ${conditions.join(' AND ')}`;
    }

    querySQL += `
      GROUP BY t.id, c.id, c.name
      ORDER BY 
        t.due_date ASC NULLS LAST,
        t.created_at DESC
    `;

    const result = await query(querySQL, params);
    res.json({ tasks: result.rows });
  } catch (error: any) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

/**
 * Get a single task by ID - matching message-backend
 */
export const getTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const taskResult = await query(
      `SELECT 
        t.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'phone', u.mobile,
            'profile_photo', u.profile_photo_url,
            'accepted_at', ta.accepted_at,
            'has_accepted', CASE WHEN ta.accepted_at IS NOT NULL THEN true ELSE false END
          )
        ) FILTER (WHERE u.id IS NOT NULL) as assignees,
        (
          SELECT jsonb_build_object(
            'accepted_at', ta2.accepted_at,
            'has_accepted', CASE WHEN ta2.accepted_at IS NOT NULL THEN true ELSE false END
          )
          FROM task_assignees ta2
          WHERE ta2.task_id = t.id AND ta2.user_id = $2
        ) as current_user_status,
        c.id as conversation_id,
        c.name as conversation_name,
        creator.name as creator_name,
        creator.profile_photo_url as creator_photo
      FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      LEFT JOIN conversations c ON c.task_id = t.id AND c.is_task_group = TRUE
      LEFT JOIN users creator ON COALESCE(t.created_by, t.creator_id) = creator.id
      WHERE t.id = $1 AND (ta.user_id = $2 OR COALESCE(t.created_by, t.creator_id) = $2)
      GROUP BY t.id, c.id, c.name, creator.name, creator.profile_photo_url`,
      [id, userId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get activity log
    const activitiesResult = await query(
      `SELECT 
        ta.*,
        u.name as user_name,
        u.profile_photo_url as user_photo
      FROM task_activities ta
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = $1
      ORDER BY ta.created_at DESC`,
      [id]
    );

    const task = taskResult.rows[0];
    task.activities = activitiesResult.rows;

    res.json({ task });
  } catch (error: any) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

/**
 * Create a new task - matching message-backend
 */
export const createTask = async (req: AuthRequest, res: Response) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const userId = req.user?.userId;
    const {
      title,
      description,
      task_type,
      priority,
      assignee_ids,
      start_date,
      target_date,
      due_date,
      recurrence_type,
      recurrence_interval,
      auto_escalate,
      escalation_rules,
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!title || !due_date) {
      return res.status(400).json({ error: 'Title and due date are required' });
    }

    // Get user's organization_id
    let organizationId = req.user?.organizationId;
    if (!organizationId) {
      // Fetch from database if not in JWT
      const orgResult = await client.query(
        `SELECT organization_id FROM user_organizations WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      organizationId = orgResult.rows[0]?.organization_id || null;
    }
    
    // Check if organization_id column exists and is required
    const orgIdColumnCheck = await client.query(
      `SELECT column_name, is_nullable 
       FROM information_schema.columns 
       WHERE table_name = 'tasks' AND column_name = 'organization_id'`
    );
    const orgIdColumn = orgIdColumnCheck.rows[0];
    const requiresOrganizationId = orgIdColumn && orgIdColumn.is_nullable === 'NO';
    
    if (requiresOrganizationId && !organizationId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Organization ID is required. User must be associated with an organization.' 
      });
    }

    // Insert task
    // Check which columns exist - handle both created_by and creator_id, and organization_id
    const columnCheck = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'tasks' AND column_name IN ('created_by', 'creator_id', 'organization_id')`
    );
    const hasCreatedBy = columnCheck.rows.some((r: any) => r.column_name === 'created_by');
    const hasCreatorId = columnCheck.rows.some((r: any) => r.column_name === 'creator_id');
    const hasOrganizationId = columnCheck.rows.some((r: any) => r.column_name === 'organization_id');
    
    // Build INSERT statement with both columns if they exist
    let insertColumns = ['title', 'description', 'task_type'];
    let insertValues = [title, description, task_type || 'one_time'];
    let paramIndex = 4;
    
    // Add creator column(s) - set both if both exist
    if (hasCreatedBy && hasCreatorId) {
      // Both columns exist - set both to userId
      insertColumns.push('created_by', 'creator_id');
      insertValues.push(userId, userId);
      paramIndex += 2;
    } else if (hasCreatedBy) {
      insertColumns.push('created_by');
      insertValues.push(userId);
      paramIndex += 1;
    } else if (hasCreatorId) {
      insertColumns.push('creator_id');
      insertValues.push(userId);
      paramIndex += 1;
    } else {
      // Default to created_by if neither exists (shouldn't happen, but safety)
      insertColumns.push('created_by');
      insertValues.push(userId);
      paramIndex += 1;
    }
    
    // Add organization_id if column exists
    if (hasOrganizationId) {
      insertColumns.push('organization_id');
      insertValues.push(organizationId);
      paramIndex += 1;
    }
    
    // Add remaining columns
    insertColumns.push('start_date', 'target_date', 'due_date', 'recurrence_type', 'recurrence_interval', 'auto_escalate', 'escalation_rules');
    insertValues.push(
      start_date || null,
      target_date || null,
      due_date,
      recurrence_type || null,
      recurrence_interval || 1,
      auto_escalate || false,
      escalation_rules ? JSON.stringify(escalation_rules) : null
    );
    
    // Build parameterized query
    const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
    
    const taskResult = await client.query(
      `INSERT INTO tasks (${insertColumns.join(', ')})
       VALUES (${placeholders})
       RETURNING *`,
      insertValues
    );

    const task = taskResult.rows[0];

    // Assign task to users
    if (assignee_ids && assignee_ids.length > 0) {
      for (const assigneeId of assignee_ids) {
        await client.query(
          `INSERT INTO task_assignees (task_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (task_id, user_id) DO NOTHING`,
          [task.id, assigneeId]
        );
      }
    }

    // Create task activity log
    await client.query(
      `INSERT INTO task_activities (task_id, user_id, activity_type, new_value, message)
       VALUES ($1, $2, 'created', $3, $4)`,
      [task.id, userId, 'pending', `Task "${title}" created`]
    );

    // Auto-create task group conversation
    const conversationResult = await client.query(
      `INSERT INTO conversations (id, type, name, is_group, is_task_group, task_id, created_by)
       VALUES (gen_random_uuid(), 'group', $1, TRUE, TRUE, $2, $3)
       RETURNING *`,
      [`Task: ${title}`, task.id, userId]
    );

    const conversation = conversationResult.rows[0];

    // Get creator's name for the welcome message
    const creatorResult = await client.query(
      `SELECT name FROM users WHERE id = $1`,
      [userId]
    );
    const creatorName = creatorResult.rows[0]?.name || 'Admin';

    // Add only creator (admin) to conversation initially
    // Assignees will be added only when they accept the task
    await client.query(
      `INSERT INTO conversation_members (conversation_id, user_id, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversation.id, userId]
    );

    // Create auto-generated message in task group
    // Check which columns exist in messages table
    const messageColumnCheck = await client.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'messages' AND column_name = 'sender_organization_id'`
    );
    const hasSenderOrgId = messageColumnCheck.rows.some((r: any) => r.column_name === 'sender_organization_id');
    
    // Build INSERT statement - use conversation_id (new schema), not group_id (old schema)
    // The conversation_id is sufficient for task group messages
    // Don't set group_id as it references the old 'groups' table, not 'conversations'
    let messageColumns = ['conversation_id', 'sender_id', 'content', 'message_type', 'status'];
    let messageValues: any[] = [conversation.id, userId, `Task group auto-created by ${creatorName}`, 'text', 'sent'];
    
    // Add sender_organization_id if column exists
    if (hasSenderOrgId && organizationId) {
      messageColumns.push('sender_organization_id');
      messageValues.push(organizationId);
    }
    
    // Build parameterized query
    const messagePlaceholders = messageValues.map((_, i) => `$${i + 1}`).join(', ');
    
    const messageResult = await client.query(
      `INSERT INTO messages (${messageColumns.join(', ')})
       VALUES (${messagePlaceholders})
       RETURNING id`,
      messageValues
    );
    
    const messageId = messageResult.rows[0].id;
    
    // Create message_status entry for the sender
    // Check if message_status table uses status_at or created_at
    try {
      await client.query(
        `INSERT INTO message_status (message_id, user_id, status, status_at)
         VALUES ($1, $2, 'sent', NOW())`,
        [messageId, userId]
      );
    } catch (error: any) {
      // If error is about column name, try with created_at
      if (error.message && error.message.includes('created_at')) {
        await client.query(
          `INSERT INTO message_status (message_id, user_id, status, created_at)
           VALUES ($1, $2, 'sent', NOW())`,
          [messageId, userId]
        );
      } else {
        // If message_status table doesn't exist or has different structure, log warning
        console.warn('[createTask] Could not create message_status entry:', error.message);
      }
    }

    await client.query('COMMIT');

    // Fetch full task with assignees
    const fullTaskResult = await query(
      `SELECT 
        t.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'phone', u.mobile,
            'profile_photo', u.profile_photo_url
          )
        ) FILTER (WHERE u.id IS NOT NULL) as assignees,
        $1::uuid as conversation_id
      FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE t.id = $2
      GROUP BY t.id`,
      [conversation.id, task.id]
    );

    res.status(201).json({ task: fullTaskResult.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  } finally {
    client.release();
  }
};

/**
 * Accept a task - matching message-backend
 */
export const acceptTask = async (req: AuthRequest, res: Response) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is assigned to this task
    const assigneeCheck = await client.query(
      `SELECT * FROM task_assignees WHERE task_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (assigneeCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this task' });
    }

    // Check if user has already accepted
    if (assigneeCheck.rows[0].accepted_at) {
      return res.status(400).json({ error: 'You have already accepted this task' });
    }

    // Update assignee acceptance
    await client.query(
      `UPDATE task_assignees 
       SET accepted_at = CURRENT_TIMESTAMP
       WHERE task_id = $1 AND user_id = $2`,
      [id, userId]
    );

    // Add user to task group conversation when they accept
    const conversationResult = await client.query(
      `SELECT id FROM conversations WHERE task_id = $1 AND is_task_group = TRUE LIMIT 1`,
      [id]
    );

    if (conversationResult.rows.length > 0) {
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 'member')
         ON CONFLICT (conversation_id, user_id) DO NOTHING`,
        [conversationResult.rows[0].id, userId]
      );
    }

    // Get task status and assignee counts
    const taskResult = await client.query(
      `SELECT 
        t.status,
        (SELECT COUNT(*) FROM task_assignees WHERE task_id = $1) as total_assignees,
        (SELECT COUNT(*) FROM task_assignees WHERE task_id = $1 AND accepted_at IS NOT NULL) as accepted_count
      FROM tasks t
      WHERE t.id = $1`,
      [id]
    );

    const taskStatus = taskResult.rows[0].status;
    const totalAssignees = parseInt(taskResult.rows[0].total_assignees);
    const acceptedCount = parseInt(taskResult.rows[0].accepted_count);

    // Update task status only when ALL assignees have accepted
    // If more than 2 assignees, require at least 2 to accept (as per requirement)
    const minRequiredAcceptances = totalAssignees > 2 ? 2 : totalAssignees;
    
    if (taskStatus === 'pending' && acceptedCount >= minRequiredAcceptances) {
      // Check if all assignees have accepted
      if (acceptedCount >= totalAssignees) {
        await client.query(
          `UPDATE tasks SET status = 'in_progress' WHERE id = $1`,
          [id]
        );

        // Log activity
        await client.query(
          `INSERT INTO task_activities (task_id, user_id, activity_type, old_value, new_value, message)
           VALUES ($1, $2, 'status_changed', 'pending', 'in_progress', 'All assignees accepted - Task started')`,
          [id, userId]
        );
      } else {
        // Log partial acceptance
        await client.query(
          `INSERT INTO task_activities (task_id, user_id, activity_type, message)
           VALUES ($1, $2, 'accepted', $3)`,
          [id, userId, `Task accepted (${acceptedCount}/${totalAssignees} accepted)`]
        );
      }
    } else {
      // Log acceptance
      await client.query(
        `INSERT INTO task_activities (task_id, user_id, activity_type, message)
         VALUES ($1, $2, 'accepted', $3)`,
        [id, userId, `Task accepted (${acceptedCount}/${totalAssignees} accepted)`]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Task accepted successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Accept task error:', error);
    res.status(500).json({ error: 'Failed to accept task' });
  } finally {
    client.release();
  }
};

/**
 * Reject a task - matching message-backend
 */
export const rejectTask = async (req: AuthRequest, res: Response) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const userId = req.user?.userId;
    const { id } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Check if user is assigned to this task
    const assigneeCheck = await client.query(
      `SELECT * FROM task_assignees WHERE task_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (assigneeCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not assigned to this task' });
    }

    // Get conversation first (before removing user)
    const conversationResult = await client.query(
      `SELECT id FROM conversations WHERE task_id = $1 AND is_task_group = TRUE LIMIT 1`,
      [id]
    );

    // Update assignee rejection - remove acceptance if it was accepted
    await client.query(
      `UPDATE task_assignees 
       SET accepted_at = NULL
       WHERE task_id = $1 AND user_id = $2`,
      [id, userId]
    );

    // Note: task_assignees table doesn't have rejected_at or rejection_reason columns
    // Rejection is tracked via the task status and task_activities log

    // Log activity
    await client.query(
      `INSERT INTO task_activities (task_id, user_id, activity_type, message)
       VALUES ($1, $2, 'rejected', $3)`,
      [id, userId, `Task rejected: ${reason}`]
    );

    // Post rejection message to task group chat (before removing user)
    if (conversationResult.rows.length > 0) {
      // Check if user is still a member (they might not have accepted yet)
      const memberCheck = await client.query(
        `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
        [conversationResult.rows[0].id, userId]
      );

      if (memberCheck.rows.length > 0) {
        // User is a member, post message
        await client.query(
          `INSERT INTO messages (conversation_id, sender_id, content, message_type)
           VALUES ($1, $2, $3, 'text')`,
          [conversationResult.rows[0].id, userId, `Task rejected. Reason: ${reason}`]
        );

        // Remove user from task group conversation after posting message
        await client.query(
          `DELETE FROM conversation_members 
           WHERE conversation_id = $1 AND user_id = $2`,
          [conversationResult.rows[0].id, userId]
        );
      } else {
        // User was never a member (never accepted), admin will see rejection in task details
        // No need to post message or remove from conversation
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Task rejected successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Reject task error:', error);
    res.status(500).json({ error: 'Failed to reject task' });
  } finally {
    client.release();
  }
};

/**
 * Update task status - matching message-backend
 */
export const updateTaskStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!['pending', 'in_progress', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(
      `UPDATE tasks 
       SET status = $1, 
           completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND (COALESCE(created_by, creator_id) = $3 OR EXISTS (
         SELECT 1 FROM task_assignees WHERE task_id = $2 AND user_id = $3
       ))
       RETURNING *`,
      [status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Log activity
    await query(
      `INSERT INTO task_activities (task_id, user_id, activity_type, new_value, message)
       VALUES ($1, $2, 'status_changed', $3, $4)`,
      [id, userId, status, `Task status changed to ${status}`]
    );

    res.json({ task: result.rows[0] });
  } catch (error: any) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

/**
 * Update task - matching message-backend
 */
export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build dynamic update query
    const allowedFields = ['title', 'description', 'start_date', 'target_date', 'due_date'];
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(id, userId);
    const result = await query(
      `UPDATE tasks 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} AND COALESCE(created_by, creator_id) = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    res.json({ task: result.rows[0] });
  } catch (error: any) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};
