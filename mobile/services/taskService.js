import api from './api';

export const getTasks = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.type) params.append('taskType', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.priority) params.append('priority', filters.priority);
    
    const queryString = params.toString();
    const url = `/api/tasks${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    // Backend returns: { success: true, data: tasks }
    return response.data.success ? response.data.data : response.data.tasks || [];
  } catch (error) {
    console.error('Get tasks error:', error);
    throw error;
  }
};

export const getTask = async (taskId) => {
  try {
    const response = await api.get(`/api/tasks/${taskId}`);
    // Backend returns: { success: true, data: task }
    return response.data.success ? response.data.data : response.data.task;
  } catch (error) {
    console.error('Get task error:', error);
    throw error;
  }
};

export const createTask = async (taskData) => {
  try {
    const response = await api.post('/api/tasks', taskData);
    // Backend returns: { success: true, data: task }
    return response.data.success ? response.data.data : response.data.task;
  } catch (error) {
    console.error('Create task error:', error);
    throw error;
  }
};

export const acceptTask = async (taskId) => {
  try {
    const response = await api.post(`/api/tasks/${taskId}/accept`);
    return response.data;
  } catch (error) {
    console.error('Accept task error:', error);
    throw error;
  }
};

export const rejectTask = async (taskId, reason) => {
  try {
    const response = await api.post(`/api/tasks/${taskId}/reject`, { reason });
    return response.data;
  } catch (error) {
    console.error('Reject task error:', error);
    throw error;
  }
};

export const updateTaskStatus = async (taskId, status) => {
  try {
    const response = await api.patch(`/api/tasks/${taskId}/status`, { status });
    // Backend returns: { success: true, task }
    return response.data.success ? response.data.task : response.data.data;
  } catch (error) {
    console.error('Update task status error:', error);
    throw error;
  }
};

export const updateTask = async (taskId, updates) => {
  try {
    const response = await api.put(`/api/tasks/${taskId}`, updates);
    // Backend returns: { success: true, data: task }
    return response.data.success ? response.data.data : response.data.task;
  } catch (error) {
    console.error('Update task error:', error);
    throw error;
  }
};

