import { Request, Response } from 'express';
import {
  createTask,
  getTaskById,
  getUserTasks,
  acceptTask,
  rejectTask,
  completeTask,
  getTaskAssignments,
  updateTask,
} from '../services/taskService';

/**
 * Create a new task
 */
export const createTaskHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const organizationId = (req as any).user?.organizationId;

    if (!userId || !organizationId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const {
      title,
      description,
      taskType,
      startDate,
      targetDate,
      dueDate,
      frequency,
      specificWeekday,
      category,
      assignedUserIds,
      complianceId,
    } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
      });
    }

    if (!taskType || !['one_time', 'recurring'].includes(taskType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task type',
      });
    }

    if (!assignedUserIds || !Array.isArray(assignedUserIds) || assignedUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one assignee is required',
      });
    }

    const task = await createTask(
      title,
      description || null,
      taskType,
      userId,
      organizationId,
      startDate ? new Date(startDate) : null,
      targetDate ? new Date(targetDate) : null,
      dueDate ? new Date(dueDate) : null,
      frequency || null,
      specificWeekday || null,
      category || null,
      assignedUserIds,
      complianceId || null
    );

    res.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create task',
    });
  }
};

/**
 * Get task by ID
 */
export const getTaskHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { taskId } = req.params;

    const task = await getTaskById(taskId, userId);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get task',
    });
  }
};

/**
 * Get user's tasks
 */
export const getUserTasksHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { status, category, taskType, isSelfTask } = req.query;

    const tasks = await getUserTasks(userId, {
      status: status as any,
      category: category as any,
      taskType: taskType as any,
      isSelfTask: isSelfTask === 'true',
    });

    res.json({
      success: true,
      data: tasks,
    });
  } catch (error: any) {
    console.error('Get user tasks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get tasks',
    });
  }
};

/**
 * Accept a task
 */
export const acceptTaskHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { taskId } = req.params;

    const assignment = await acceptTask(taskId, userId);

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error: any) {
    console.error('Accept task error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to accept task',
    });
  }
};

/**
 * Reject a task
 */
export const rejectTaskHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { taskId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required',
      });
    }

    const assignment = await rejectTask(taskId, userId, rejectionReason);

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error: any) {
    console.error('Reject task error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to reject task',
    });
  }
};

/**
 * Complete a task
 */
export const completeTaskHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { taskId } = req.params;

    const assignment = await completeTask(taskId, userId);

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error: any) {
    console.error('Complete task error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to complete task',
    });
  }
};

/**
 * Get task assignments
 */
export const getTaskAssignmentsHandler = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const assignments = await getTaskAssignments(taskId);

    res.json({
      success: true,
      data: assignments,
    });
  } catch (error: any) {
    console.error('Get task assignments error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get task assignments',
    });
  }
};

/**
 * Update task
 */
export const updateTaskHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { taskId } = req.params;
    const { title, description, startDate, targetDate, dueDate } = req.body;

    const task = await updateTask(taskId, userId, {
      title,
      description,
      startDate: startDate ? new Date(startDate) : undefined,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    res.json({
      success: true,
      data: task,
    });
  } catch (error: any) {
    console.error('Update task error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update task',
    });
  }
};

