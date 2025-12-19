import { query } from '../config/database';
import { Task, TaskCategory } from '../../../shared/src/types';
import { getReminderConfig } from './platformSettingsService';

export interface DashboardTask extends Task {
  isSelfTask: boolean;
  assignmentStatus?: string;
  daysUntilDue?: number;
}

export interface TaskCategoryGroup {
  overdue: DashboardTask[];
  dueSoon: DashboardTask[];
  inProgress: DashboardTask[];
  completed: DashboardTask[];
}

export interface DashboardData {
  selfTasks: {
    general: TaskCategoryGroup;
    documentManagement: TaskCategoryGroup;
    complianceManagement: TaskCategoryGroup;
  };
  assignedTasks: {
    general: TaskCategoryGroup;
    documentManagement: TaskCategoryGroup;
    complianceManagement: TaskCategoryGroup;
  };
}

/**
 * Calculate days until due date
 */
const calculateDaysUntilDue = (dueDate: Date | null): number | null => {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Categorize task by status
 */
const categorizeTask = (
  task: DashboardTask,
  dueSoonDays: number = 3
): 'overdue' | 'dueSoon' | 'inProgress' | 'completed' => {
  if (task.status === 'completed') {
    return 'completed';
  }

  if (task.status === 'overdue') {
    return 'overdue';
  }

  const daysUntilDue = task.daysUntilDue;
  if (daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= dueSoonDays) {
    return 'dueSoon';
  }

  if (task.status === 'in_progress' || task.assignmentStatus === 'accepted') {
    return 'inProgress';
  }

  // Default to inProgress for pending tasks that are accepted
  return 'inProgress';
};

/**
 * Get dashboard data for a user
 */
export const getDashboardData = async (
  userId: string,
  dueSoonDays?: number
): Promise<DashboardData> => {
  // Get due soon days from platform settings if not provided
  if (dueSoonDays === undefined) {
    const reminderConfig = await getReminderConfig();
    dueSoonDays = reminderConfig.dueSoonDays;
  }
  // Get self tasks (created by user)
  const selfTasksResult = await query(
    `SELECT 
      t.*,
      true as is_self_task,
      NULL as assignment_status,
      t.due_date
     FROM tasks t
     WHERE t.creator_id = $1
     AND NOT EXISTS (
       SELECT 1 FROM task_assignments ta 
       WHERE ta.task_id = t.id AND ta.assigned_to_user_id != $1
     )
     ORDER BY t.created_at DESC`,
    [userId]
  );

  // Get assigned tasks (assigned to user, but not created by them)
  const assignedTasksResult = await query(
    `SELECT 
      t.*,
      false as is_self_task,
      ta.status as assignment_status,
      t.due_date
     FROM tasks t
     INNER JOIN task_assignments ta ON t.id = ta.task_id
     WHERE ta.assigned_to_user_id = $1
     AND t.creator_id != $1
     ORDER BY t.created_at DESC`,
    [userId]
  );

  // Process self tasks
  const selfTasks: DashboardTask[] = selfTasksResult.rows.map((row) => ({
    ...row,
    isSelfTask: true,
    daysUntilDue: calculateDaysUntilDue(row.due_date),
  }));

  // Process assigned tasks
  const assignedTasks: DashboardTask[] = assignedTasksResult.rows.map((row) => ({
    ...row,
    isSelfTask: false,
    assignmentStatus: row.assignment_status,
    daysUntilDue: calculateDaysUntilDue(row.due_date),
  }));

  // Categorize tasks
  const categorizeTasks = (tasks: DashboardTask[]): {
    general: TaskCategoryGroup;
    documentManagement: TaskCategoryGroup;
    complianceManagement: TaskCategoryGroup;
  } => {
    const general: TaskCategoryGroup = {
      overdue: [],
      dueSoon: [],
      inProgress: [],
      completed: [],
    };

    const documentManagement: TaskCategoryGroup = {
      overdue: [],
      dueSoon: [],
      inProgress: [],
      completed: [],
    };

    const complianceManagement: TaskCategoryGroup = {
      overdue: [],
      dueSoon: [],
      inProgress: [],
      completed: [],
    };

    for (const task of tasks) {
      const category = categorizeTask(task, dueSoonDays);
      const taskCategory = task.category || 'general';

      if (taskCategory === 'document_management') {
        documentManagement[category].push(task);
      } else if (taskCategory === 'compliance_management') {
        complianceManagement[category].push(task);
      } else {
        general[category].push(task);
      }
    }

    return { general, documentManagement, complianceManagement };
  };

  return {
    selfTasks: categorizeTasks(selfTasks),
    assignedTasks: categorizeTasks(assignedTasks),
  };
};

/**
 * Get task statistics for dashboard
 */
export const getTaskStatistics = async (userId: string): Promise<{
  selfTasksTotal: number;
  selfTasksOverdue: number;
  selfTasksDueSoon: number;
  selfTasksInProgress: number;
  selfTasksCompleted: number;
  assignedTasksTotal: number;
  assignedTasksOverdue: number;
  assignedTasksDueSoon: number;
  assignedTasksInProgress: number;
  assignedTasksCompleted: number;
}> => {
  // Get due soon days from platform settings
  const reminderConfig = await getReminderConfig();
  const dueSoonDays = reminderConfig.dueSoonDays;

  // Self tasks counts
  const selfTasksCountResult = await query(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
      COUNT(*) FILTER (WHERE status = 'completed') as completed,
      COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
      COUNT(*) FILTER (
        WHERE status NOT IN ('completed', 'overdue') 
        AND due_date IS NOT NULL 
        AND due_date >= CURRENT_DATE 
        AND due_date <= CURRENT_DATE + INTERVAL '1 day' * $2
      ) as due_soon
     FROM tasks
     WHERE creator_id = $1
     AND NOT EXISTS (
       SELECT 1 FROM task_assignments ta 
       WHERE ta.task_id = tasks.id AND ta.assigned_to_user_id != $1
     )`,
    [userId, dueSoonDays]
  );

  // Assigned tasks counts
  const assignedTasksCountResult = await query(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE t.status = 'overdue') as overdue,
      COUNT(*) FILTER (WHERE t.status = 'completed') as completed,
      COUNT(*) FILTER (WHERE t.status = 'in_progress' OR ta.status = 'accepted') as in_progress,
      COUNT(*) FILTER (
        WHERE t.status NOT IN ('completed', 'overdue') 
        AND t.due_date IS NOT NULL 
        AND t.due_date >= CURRENT_DATE 
        AND t.due_date <= CURRENT_DATE + INTERVAL '1 day' * $2
      ) as due_soon
     FROM tasks t
     INNER JOIN task_assignments ta ON t.id = ta.task_id
     WHERE ta.assigned_to_user_id = $1
     AND t.creator_id != $1`,
    [userId, dueSoonDays]
  );

  const selfTasks = selfTasksCountResult.rows[0];
  const assignedTasks = assignedTasksCountResult.rows[0];

  return {
    selfTasksTotal: parseInt(selfTasks.total) || 0,
    selfTasksOverdue: parseInt(selfTasks.overdue) || 0,
    selfTasksDueSoon: parseInt(selfTasks.due_soon) || 0,
    selfTasksInProgress: parseInt(selfTasks.in_progress) || 0,
    selfTasksCompleted: parseInt(selfTasks.completed) || 0,
    assignedTasksTotal: parseInt(assignedTasks.total) || 0,
    assignedTasksOverdue: parseInt(assignedTasks.overdue) || 0,
    assignedTasksDueSoon: parseInt(assignedTasks.due_soon) || 0,
    assignedTasksInProgress: parseInt(assignedTasks.in_progress) || 0,
    assignedTasksCompleted: parseInt(assignedTasks.completed) || 0,
  };
};

