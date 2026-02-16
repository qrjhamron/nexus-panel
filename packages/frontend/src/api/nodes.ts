import apiClient from './client';

export const nodesApi = {
  list: (params?: { page?: number; perPage?: number }) => apiClient.get('/admin/nodes', { params }),
  get: (id: string | number) => apiClient.get(`/admin/nodes/${id}`),
  create: (data: Record<string, unknown>) => apiClient.post('/admin/nodes', data),
  update: (id: string | number, data: Record<string, unknown>) =>
    apiClient.patch(`/admin/nodes/${id}`, data),
  delete: (id: string | number) => apiClient.delete(`/admin/nodes/${id}`),
  getConfig: (id: string | number) => apiClient.get(`/admin/nodes/${id}/config`),
  getAllocations: (id: string | number) => apiClient.get(`/admin/nodes/${id}/allocations`),
  createAllocation: (id: string | number, data: Record<string, unknown>) =>
    apiClient.post(`/admin/nodes/${id}/allocations`, data),
};
