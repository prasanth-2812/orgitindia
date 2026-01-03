import api from './api';

// Entity Master Data
export const getOrganizationData = async () => {
  const response = await api.get('/api/admin/organization');
  return response.data;
};

export const createOrganizationData = async (data) => {
  const response = await api.post('/api/admin/organization', data);
  return response.data;
};

export const updateOrganizationData = async (data) => {
  const response = await api.put('/api/admin/organization', data);
  return response.data;
};

// Departments
export const getDepartments = async () => {
  const response = await api.get('/api/admin/departments');
  return response.data;
};

export const createDepartment = async (data) => {
  const response = await api.post('/api/admin/departments', data);
  return response.data;
};

export const updateDepartment = async (id, data) => {
  const response = await api.put(`/api/admin/departments/${id}`, data);
  return response.data;
};

export const deleteDepartment = async (id) => {
  const response = await api.delete(`/api/admin/departments/${id}`);
  return response.data;
};

// Designations
export const getDesignations = async () => {
  const response = await api.get('/api/admin/designations');
  return response.data;
};

export const createDesignation = async (data) => {
  const response = await api.post('/api/admin/designations', data);
  return response.data;
};

export const updateDesignation = async (id, data) => {
  const response = await api.put(`/api/admin/designations/${id}`, data);
  return response.data;
};

export const deleteDesignation = async (id) => {
  const response = await api.delete(`/api/admin/designations/${id}`);
  return response.data;
};

// Employees
export const getEmployees = async () => {
  const response = await api.get('/api/admin/employees');
  return response.data;
};

export const createEmployee = async (data) => {
  const response = await api.post('/api/admin/employees', data);
  return response.data;
};

export const updateEmployee = async (id, data) => {
  const response = await api.put(`/api/admin/employees/${id}`, data);
  return response.data;
};

export const removeEmployee = async (id) => {
  const response = await api.delete(`/api/admin/employees/${id}`);
  return response.data;
};

// Reminder Configuration
export const getReminderConfig = async () => {
  const response = await api.get('/api/settings/reminder');
  return response.data;
};

export const updateReminderConfig = async (data) => {
  const response = await api.put('/api/settings/reminder', data);
  return response.data;
};

// Auto Escalation Configuration
export const getAutoEscalationConfig = async () => {
  const response = await api.get('/api/settings/auto-escalation');
  return response.data;
};

export const updateAutoEscalationConfig = async (data) => {
  const response = await api.put('/api/settings/auto-escalation', data);
  return response.data;
};

// Recurring Tasks Settings
export const getRecurringTasksSettings = async () => {
  const response = await api.get('/api/settings/recurring-tasks');
  return response.data;
};

export const updateRecurringTasksSettings = async (data) => {
  const response = await api.put('/api/settings/recurring-tasks', data);
  return response.data;
};

// Reporting Hierarchy
export const getReportingHierarchy = async () => {
  const response = await api.get('/api/organization/hierarchy');
  return response.data;
};

export const updateReportingHierarchy = async (data) => {
  const response = await api.put('/api/organization/hierarchy', data);
  return response.data;
};

