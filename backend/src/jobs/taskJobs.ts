import cron from 'node-cron';
import {
  escalateUnacceptedTasks,
  escalateOverdueTasks,
  escalateMissedRecurrence,
} from '../services/escalationService';
import { generateNextRecurrence } from '../services/recurringTaskService';
import { query } from '../config/database';

/**
 * Update task statuses (overdue, due soon)
 */
export const updateTaskStatuses = async (): Promise<void> => {
  // Mark tasks as overdue
  await query(
    `UPDATE tasks 
     SET status = 'overdue', updated_at = NOW()
     WHERE due_date IS NOT NULL
     AND due_date < CURRENT_DATE
     AND status NOT IN ('completed', 'rejected', 'overdue')`,
    []
  );

  // Note: "Due Soon" is calculated on-the-fly in the dashboard service
  // based on due_date and configured "due soon days"
};

/**
 * Setup scheduled jobs
 */
export const setupTaskJobs = (): void => {
  // Run every hour: Check for escalations and update task statuses
  cron.schedule('0 * * * *', async () => {
    console.log('Running task status update job...');
    try {
      await updateTaskStatuses();
      await escalateUnacceptedTasks();
      await escalateOverdueTasks();
      await escalateMissedRecurrence();
    } catch (error) {
      console.error('Error in task status update job:', error);
    }
  });

  // Run daily at midnight: Generate next recurrence for recurring tasks
  cron.schedule('0 0 * * *', async () => {
    console.log('Running recurring task generation job...');
    try {
      await generateNextRecurrence();
    } catch (error) {
      console.error('Error in recurring task generation job:', error);
    }
  });

  console.log('Task scheduled jobs initialized');
};

