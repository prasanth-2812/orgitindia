import api from './api';

export interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const userService = {
  getAll: (filters?: UserFilters) =>
    api.get('/super-admin/users', { params: filters }),
  getById: (id: string) => api.get(`/super-admin/users/${id}`),
  delete: (id: string) => api.delete(`/super-admin/users/${id}`),
};

