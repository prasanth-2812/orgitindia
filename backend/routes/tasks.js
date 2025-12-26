const express = require('express');
const pool = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all tasks for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, status, priority } = req.query;

    let query = `
      SELECT 
        t.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'phone', u.phone,
            'profile_photo', u.profile_photo,
            'accepted_at', ta.accepted_at,
            'rejected_at', ta.rejected_at,
            'has_accepted', CASE WHEN ta.accepted_at IS NOT NULL THEN true ELSE false END,
            'has_rejected', CASE WHEN ta.rejected_at IS NOT NULL THEN true ELSE false END
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
          WHERE ta2.task_id = t.id AND ta2.rejected_at IS NOT NULL
        ) as rejected_count,
        (
          SELECT COUNT(*)
          FROM task_assignees ta2
          WHERE ta2.task_id = t.id
        ) as total_assignees,
        (
          SELECT jsonb_build_object(
            'accepted_at', ta3.accepted_at,
            'rejected_at', ta3.rejected_at,
            'has_accepted', CASE WHEN ta3.accepted_at IS NOT NULL THEN true ELSE false END,
            'has_rejected', CASE WHEN ta3.rejected_at IS NOT NULL THEN true ELSE false END
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

    const params = [userId];
    const conditions = [];

    // Always filter by task_type if provided
    if (type) {
      conditions.push(`t.task_type = $${params.length + 1}`);
      params.push(type);
    }

    if (status) {
      conditions.push(`t.status = $${params.length + 1}`);
      params.push(status);
    }

    if (priority) {
      conditions.push(`t.priority = $${params.length + 1}`);
      params.push(priority);
    }

    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    query += `
      GROUP BY t.id, c.id, c.name
      ORDER BY 
        CASE t.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        t.due_date ASC,
        t.created_at DESC
    `;

    const result = await pool.query(query, params);
    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get a single task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const taskResult = await pool.query(
      `SELECT 
        t.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'phone', u.phone,
            'profile_photo', u.profile_photo,
            'accepted_at', ta.accepted_at,
            'rejected_at', ta.rejected_at,
            'has_accepted', CASE WHEN ta.accepted_at IS NOT NULL THEN true ELSE false END,
            'has_rejected', CASE WHEN ta.rejected_at IS NOT NULL THEN true ELSE false END
          )
        ) FILTER (WHERE u.id IS NOT NULL) as assignees,
        (
          SELECT jsonb_build_object(
            'accepted_at', ta2.accepted_at,
            'rejected_at', ta2.rejected_at,
            'has_accepted', CASE WHEN ta2.accepted_at IS NOT NULL THEN true ELSE false END,
            'has_rejected', CASE WHEN ta2.rejected_at IS NOT NULL THEN true ELSE false END
          )
          FROM task_assignees ta2
          WHERE ta2.task_id = t.id AND ta2.user_id = $2
        ) as current_user_status,
        c.id as conversation_id,
        c.name as conversation_name,
        creator.name as creator_name,
        creator.profile_photo as creator_photo
      FROM tasks t
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      LEFT JOIN conversations c ON c.task_id = t.id AND c.is_task_group = TRUE
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = $1 AND (ta.user_id = $2 OR t.created_by = $2)
      GROUP BY t.id, c.id, c.name, creator.name, creator.profile_photo`,
      [id, userId]
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get activity log
    const activitiesResult = await pool.query(
      `SELECT 
        ta.*,
        u.name as user_name,
        u.profile_photo as user_photo
      FROM task_activities ta
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = $1
      ORDER BY ta.created_at DESC`,
      [id]
    );

    const task = taskResult.rows[0];
    task.activities = activitiesResult.rows;

    res.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create a new task
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = req.user.userId;
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

    if (!title || !due_date) {
      return res.status(400).json({ error: 'Title and due date are required' });
    }

    // Insert task
    const taskResult = await client.query(
      `INSERT INTO tasks (
        title, description, task_type, priority, created_by,
        start_date, target_date, due_date,
        recurrence_type, recurrence_interval,
        auto_escalate, escalation_rules
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        title,
        description,
        task_type || 'one_time',
        priority || 'medium',
        userId,
        start_date || null,
        target_date || null,
        due_date,
        recurrence_type || null,
        recurrence_interval || 1,
        auto_escalate || false,
        escalation_rules ? JSON.stringify(escalation_rules) : null,
      ]
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
      `INSERT INTO conversations (name, is_group, is_task_group, task_id, created_by)
       VALUES ($1, TRUE, TRUE, $2, $3)
       RETURNING *`,
      [`Task: ${title}`, task.id, userId]
    );

    const conversation = conversationResult.rows[0];

    // Add only creator (admin) to conversation initially
    // Assignees will be added only when they accept the task
    await client.query(
      `INSERT INTO conversation_members (conversation_id, user_id, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversation.id, userId]
    );

    // Create auto-generated message in task group
    await client.query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type)
       VALUES ($1, $2, $3, 'text')`,
      [conversation.id, userId, `Task group auto-created by ${req.user.name || 'Admin'}`]
    );

    await client.query('COMMIT');

    // Fetch full task with assignees
    const fullTaskResult = await pool.query(
      `SELECT 
        t.*,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'phone', u.phone,
            'profile_photo', u.profile_photo
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
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  } finally {
    client.release();
  }
});

// Accept a task
router.post('/:id/accept', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = req.user.userId;
    const { id } = req.params;

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
       SET accepted_at = CURRENT_TIMESTAMP, rejected_at = NULL
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
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Accept task error:', error);
    res.status(500).json({ error: 'Failed to accept task' });
  } finally {
    client.release();
  }
});

// Reject a task
router.post('/:id/reject', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userId = req.user.userId;
    const { id } = req.params;
    const { reason } = req.body;

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

    // Update assignee rejection
    await client.query(
      `UPDATE task_assignees 
       SET rejected_at = CURRENT_TIMESTAMP, accepted_at = NULL
       WHERE task_id = $1 AND user_id = $2`,
      [id, userId]
    );

    // Update task rejection reason
    await client.query(
      `UPDATE tasks SET rejection_reason = $1, rejected_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [reason, id]
    );

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
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reject task error:', error);
    res.status(500).json({ error: 'Failed to reject task' });
  } finally {
    client.release();
  }
});

// Update task status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'in_progress', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE tasks 
       SET status = $1, 
           completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND (created_by = $3 OR EXISTS (
         SELECT 1 FROM task_assignees WHERE task_id = $2 AND user_id = $3
       ))
       RETURNING *`,
      [status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Log activity
    await pool.query(
      `INSERT INTO task_activities (task_id, user_id, activity_type, new_value, message)
       VALUES ($1, $2, 'status_changed', $3, $4)`,
      [id, userId, status, `Task status changed to ${status}`]
    );

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// Update task
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = ['title', 'description', 'priority', 'start_date', 'target_date', 'due_date'];
    const updateFields = [];
    const values = [];
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
    const result = await pool.query(
      `UPDATE tasks 
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} AND created_by = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or unauthorized' });
    }

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

module.exports = router;

