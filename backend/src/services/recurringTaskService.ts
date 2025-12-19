import { query } from '../config/database';
import { createTaskGroup } from './groupService';
import { calculateNextRecurrenceDate } from './taskService';

/**
 * Generate next occurrence for recurring tasks
 */
export const generateNextRecurrence = async (): Promise<void> => {
  // Get recurring tasks that are completed and have a next recurrence date
  const result = await query(
    `SELECT * FROM tasks
     WHERE task_type = 'recurring'
     AND status = 'completed'
     AND next_recurrence_date IS NOT NULL
     AND next_recurrence_date <= CURRENT_DATE`,
    []
  );

  for (const originalTask of result.rows) {
    // Get task assignments
    const assignmentsResult = await query(
      `SELECT assigned_to_user_id FROM task_assignments WHERE task_id = $1`,
      [originalTask.id]
    );

    const assignedUserIds = assignmentsResult.rows.map((row) => row.assigned_to_user_id);

    // Calculate dates for new task
    const baseDueDate = originalTask.due_date ? new Date(originalTask.due_date) : null;
    const nextRecurrenceDate = calculateNextRecurrenceDate(
      originalTask.frequency,
      originalTask.specific_weekday,
      baseDueDate
    );

    // Calculate new due date (same offset from recurrence date)
    let newDueDate: Date | null = null;
    if (originalTask.due_date && originalTask.next_recurrence_date) {
      const originalDue = new Date(originalTask.due_date);
      const originalRecurrence = new Date(originalTask.next_recurrence_date);
      const daysOffset = Math.floor(
        (originalDue.getTime() - originalRecurrence.getTime()) / (1000 * 60 * 60 * 24)
      );
      newDueDate = new Date(nextRecurrenceDate);
      newDueDate.setDate(newDueDate.getDate() + daysOffset);
    }

    // Create new task occurrence
    const newTaskResult = await query(
      `INSERT INTO tasks (
        id, title, description, task_type, creator_id, organization_id,
        start_date, target_date, due_date, frequency, specific_weekday,
        next_recurrence_date, category, status
      )
      VALUES (
        gen_random_uuid(), $1, $2, 'recurring', $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending'
      )
      RETURNING *`,
      [
        originalTask.title,
        originalTask.description,
        originalTask.creator_id,
        originalTask.organization_id,
        originalTask.start_date,
        originalTask.target_date,
        newDueDate,
        originalTask.frequency,
        originalTask.specific_weekday,
        calculateNextRecurrenceDate(
          originalTask.frequency,
          originalTask.specific_weekday,
          newDueDate
        ),
        originalTask.category,
      ]
    );

    const newTask = newTaskResult.rows[0];

    // Create task assignments
    for (const userId of assignedUserIds) {
      await query(
        `INSERT INTO task_assignments (
          id, task_id, assigned_to_user_id, assigned_by_user_id, status
        )
        VALUES (gen_random_uuid(), $1, $2, $3, 'pending')`,
        [newTask.id, userId, originalTask.creator_id]
      );
    }

    // Create task group
    await createTaskGroup(newTask.id, originalTask.creator_id, assignedUserIds, originalTask.organization_id);

    // Update original task's next recurrence date
    await query(
      `UPDATE tasks 
       SET next_recurrence_date = $1, updated_at = NOW()
       WHERE id = $2`,
      [
        calculateNextRecurrenceDate(
          originalTask.frequency,
          originalTask.specific_weekday,
          newDueDate
        ),
        originalTask.id,
      ]
    );
  }
};

