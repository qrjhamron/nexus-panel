import apiClient from './client';

export const eggsApi = {
  list: (params?: { page?: number; perPage?: number }) => apiClient.get('/admin/eggs', { params }),
  get: (id: string | number) => apiClient.get(`/admin/eggs/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/admin/eggs', data),
  update: (id: string | number, data: Record<string, unknown>) =>
    apiClient.patch(`/admin/eggs/${id}`, data),
  delete: (id: string | number) => apiClient.delete(`/admin/eggs/${id}`),
  import: (data: Record<string, unknown>) => apiClient.post('/admin/eggs/import', data),
  export: (id: string | number) => apiClient.get(`/admin/eggs/${id}/export`),
};
