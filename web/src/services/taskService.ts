import api from './api';
import { Task, TaskType, TaskCategory, TaskFrequency } from '../../../shared/src/types';

export interface CreateTaskRequest {
  title: string;
  description?: string;
  taskType: TaskType;
  startDate?: string;
  targetDate?: string;
  dueDate?: string;
  frequency?: TaskFrequency;
  specificWeekday?: number;
  category?: TaskCategory;
  assignedUserIds: string[];
  complianceId?: string;
}

export const taskService = {
  createTask: async (data: CreateTaskRequest) => {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  getTasks: async (filters?: {
    status?: string;
    category?: string;
    taskType?: string;
    isSelfTask?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.taskType) params.append('taskType', filters.taskType);
    if (filters?.isSelfTask) params.append('isSelfTask', 'true');

    const response = await api.get(`/tasks?${params.toString()}`);
    return response.data;
  },

  getTask: async (taskId: string) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  getTaskAssignments: async (taskId: string) => {
    const response = await api.get(`/tasks/${taskId}/assignments`);
    return response.data;
  },

  acceptTask: async (taskId: string) => {
    const response = await api.post(`/tasks/${taskId}/accept`);
    return response.data;
  },

  rejectTask: async (taskId: string, rejectionReason: string) => {
    const response = await api.post(`/tasks/${taskId}/reject`, { rejectionReason });
    return response.data;
  },

  completeTask: async (taskId: string) => {
    const response = await api.post(`/tasks/${taskId}/complete`);
    return response.data;
  },

  updateTask: async (taskId: string, updates: Partial<CreateTaskRequest>) => {
    const response = await api.put(`/tasks/${taskId}`, updates);
    return response.data;
  },

  getMentionableTasks: async () => {
    const response = await api.get('/tasks/mentionable');
    return response.data;
  },

  // Compliance linking
  linkComplianceToTask: async (taskId: string, complianceId: string) => {
    const response = await api.post(`/tasks/${taskId}/compliance`, { complianceId });
    return response.data;
  },

  unlinkComplianceFromTask: async (taskId: string, complianceId: string) => {
    const response = await api.delete(`/tasks/${taskId}/compliance/${complianceId}`);
    return response.data;
  },

  getTaskCompliances: async (taskId: string) => {
    const response = await api.get(`/tasks/${taskId}/compliance`);
    return response.data;
  },
};

